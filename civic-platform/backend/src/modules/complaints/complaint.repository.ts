import type { PoolClient } from "pg";
import { db } from "../../db/pool.js";
import type {
  AnalyticsSummary,
  AssignComplaintInput,
  ComplaintNotificationItem,
  ComplaintAssignmentItem,
  ComplaintNoteItem,
  ComplaintDetail,
  ComplaintHotspotItem,
  DashboardSummary,
  ComplaintFeedbackItem,
  ComplaintListItem,
  ComplaintMapItem,
  ComplaintMediaItem,
  NearbyComplaintItem,
  ComplaintStatusHistoryItem,
  CreateComplaintInput,
  CreateComplaintNoteInput,
  SubmitComplaintFeedbackInput,
  UpdateAssignmentStatusInput,
  UploadComplaintMediaInput,
  UpdateComplaintStatusInput,
} from "./complaint.types.js";
import { calculateDistanceKm, inferWardFromCoordinates } from "./complaint.geo.js";
import { clearCache } from "../../lib/cache.js";
import { writeAuditLog } from "../../lib/audit.js";

type DomainMeta = {
  id: string;
  name: string;
  isEmergency: boolean;
};

type RoutingMatch = {
  departmentId: string;
  priorityOverride: string | null;
};

const fallbackDepartmentCodeByDomain: Record<string, string> = {
  "Roads and Transportation": "roads-public-works",
  "Sanitation and Waste Management": "sanitation-solid-waste",
  "Water Supply, Sewerage, and Drainage": "water-sewerage",
  "Street Lighting and Electrical Infrastructure": "electrical-street-lighting",
  "Public Infrastructure and Amenities": "municipal-maintenance",
  "Environment and Public Health": "sanitation-solid-waste",
  "Fire Emergencies": "disaster-management",
  "Flood and Water Disaster": "disaster-management",
  "Structural and Infrastructure Hazard": "disaster-management",
  "Electrical Hazard": "disaster-management",
  "Disaster and Rescue": "disaster-management",
};

const domainBasePriority: Record<string, "P1" | "P2" | "P3" | "P4"> = {
  "Roads and Transportation": "P3",
  "Sanitation and Waste Management": "P3",
  "Water Supply, Sewerage, and Drainage": "P2",
  "Street Lighting and Electrical Infrastructure": "P3",
  "Public Infrastructure and Amenities": "P2",
  "Environment and Public Health": "P3",
  "Fire Emergencies": "P1",
  "Flood and Water Disaster": "P1",
  "Structural and Infrastructure Hazard": "P1",
  "Electrical Hazard": "P1",
  "Disaster and Rescue": "P1",
};

function buildComplaintCode() {
  const now = new Date();
  const year = now.getFullYear();
  const millis = now.getTime().toString().slice(-6);

  return `CP-${year}-${millis}`;
}

function priorityToScore(priority: string) {
  switch (priority) {
    case "P1":
      return 4;
    case "P2":
      return 3;
    case "P3":
      return 2;
    default:
      return 1;
  }
}

function scoreToPriority(score: number): "P1" | "P2" | "P3" | "P4" {
  if (score >= 4) return "P1";
  if (score === 3) return "P2";
  if (score === 2) return "P3";
  return "P4";
}

function keywordPriorityBoost(input: CreateComplaintInput) {
  const text = `${input.title} ${input.description ?? ""} ${input.addressLine ?? ""} ${input.landmark ?? ""}`.toLowerCase();

  const criticalKeywords = [
    "fire",
    "flood",
    "collapse",
    "collapsing",
    "live wire",
    "electrical hazard",
    "electrocution",
    "blast",
    "explosion",
    "rescue",
    "landslide",
    "open manhole",
  ];

  if (criticalKeywords.some((keyword) => text.includes(keyword))) {
    return 4;
  }

  const highKeywords = [
    "sewage",
    "overflow",
    "waterlogging",
    "blocked drain",
    "drainage",
    "transformer",
    "wire",
    "pothole",
    "road blockage",
    "unsafe",
    "hazard",
  ];

  if (highKeywords.some((keyword) => text.includes(keyword))) {
    return 3;
  }

  const mediumKeywords = ["garbage", "streetlight", "leak", "broken", "damaged", "mosquito", "fallen tree"];

  if (mediumKeywords.some((keyword) => text.includes(keyword))) {
    return 2;
  }

  return 0;
}

function sensitiveLocationBoost(input: CreateComplaintInput) {
  const text = `${input.addressLine ?? ""} ${input.landmark ?? ""}`.toLowerCase();
  const sensitiveKeywords = ["school", "hospital", "junction", "bus stop", "market", "highway", "underpass"];

  return sensitiveKeywords.some((keyword) => text.includes(keyword)) ? 1 : 0;
}

async function getDomainMeta(client: PoolClient, domainId?: string) {
  if (!domainId) {
    return null;
  }

  const result = await client.query<DomainMeta>(
    `
      SELECT id, name, is_emergency AS "isEmergency"
      FROM domains
      WHERE id = $1
      LIMIT 1
    `,
    [domainId],
  );

  return result.rows[0] ?? null;
}

async function findRoutingRule(client: PoolClient, input: CreateComplaintInput, isEmergency: boolean) {
  const result = await client.query<RoutingMatch>(
    `
      SELECT
        rr.department_id AS "departmentId",
        rr.priority_override AS "priorityOverride"
      FROM routing_rules rr
      WHERE rr.is_active = TRUE
        AND (rr.domain_id IS NULL OR rr.domain_id = $1)
        AND (rr.sub_problem_id IS NULL OR rr.sub_problem_id = $2)
        AND (rr.ward_id IS NULL OR rr.ward_id = $3)
      ORDER BY
        CASE WHEN rr.domain_id = $1 THEN 1 ELSE 0 END DESC,
        CASE WHEN rr.sub_problem_id = $2 THEN 1 ELSE 0 END DESC,
        CASE WHEN rr.ward_id = $3 THEN 1 ELSE 0 END DESC,
        CASE WHEN $4 = TRUE AND rr.is_emergency_route = TRUE THEN 1 ELSE 0 END DESC,
        rr.created_at ASC
      LIMIT 1
    `,
    [input.domainId ?? null, input.subProblemId ?? null, input.wardId ?? null, isEmergency],
  );

  return result.rows[0] ?? null;
}

async function getDepartmentIdByCode(client: PoolClient, code: string) {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM departments
      WHERE code = $1
      LIMIT 1
    `,
    [code],
  );

  return result.rows[0]?.id ?? null;
}

async function findPriorityRule(client: PoolClient, input: CreateComplaintInput) {
  const result = await client.query<{ basePriority: string }>(
    `
      SELECT base_priority AS "basePriority"
      FROM priority_rules
      WHERE is_active = TRUE
        AND (domain_id IS NULL OR domain_id = $1)
        AND (sub_problem_id IS NULL OR sub_problem_id = $2)
      ORDER BY
        CASE WHEN domain_id = $1 THEN 1 ELSE 0 END DESC,
        CASE WHEN sub_problem_id = $2 THEN 1 ELSE 0 END DESC,
        created_at ASC
      LIMIT 1
    `,
    [input.domainId ?? null, input.subProblemId ?? null],
  );

  return result.rows[0]?.basePriority ?? null;
}

async function deriveWorkflow(client: PoolClient, input: CreateComplaintInput) {
  const domain = await getDomainMeta(client, input.domainId);
  const isEmergency = Boolean(input.isEmergency || domain?.isEmergency);
  const routingRule = await findRoutingRule(client, input, isEmergency);

  let departmentId = routingRule?.departmentId ?? null;

  if (!departmentId && domain?.name) {
    const fallbackCode = fallbackDepartmentCodeByDomain[domain.name];

    if (fallbackCode) {
      departmentId = await getDepartmentIdByCode(client, fallbackCode);
    }
  }

  const baseFromRules = routingRule?.priorityOverride ?? (await findPriorityRule(client, input));
  const basePriority =
    (baseFromRules as "P1" | "P2" | "P3" | "P4" | null) ??
    (domain?.name ? domainBasePriority[domain.name] : null) ??
    (isEmergency ? "P1" : "P3");

  const derivedScore = Math.max(
    priorityToScore(basePriority),
    keywordPriorityBoost(input),
    Math.min(4, priorityToScore(basePriority) + sensitiveLocationBoost(input)),
  );

  const priorityLevel = scoreToPriority(derivedScore);
  const status = input.domainId ? "prioritized" : "submitted";

  return {
    departmentId,
    isEmergency,
    priorityLevel,
    status,
    domainName: domain?.name ?? null,
  };
}

async function createNotification(
  client: PoolClient,
  input: {
    userId: string;
    complaintId?: string | null;
    title: string;
    message: string;
    notificationType: string;
  },
) {
  await client.query(
    `
      INSERT INTO notifications (
        user_id,
        complaint_id,
        title,
        message,
        notification_type
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [input.userId, input.complaintId ?? null, input.title, input.message, input.notificationType],
  );
}

async function createAuditLog(
  client: PoolClient,
  input: {
    actorUserId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    details?: Record<string, unknown>;
  },
) {
  await client.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      input.actorUserId ?? null,
      input.entityType,
      input.entityId ?? null,
      input.action,
      JSON.stringify(input.details ?? {}),
    ],
  );
}

export async function createComplaint(input: CreateComplaintInput) {
  const complaintCode = buildComplaintCode();
  const client = await db.connect();
  const inferredWard = input.wardId ? null : inferWardFromCoordinates(input.latitude, input.longitude);
  const normalizedInput = {
    ...input,
    wardId: input.wardId ?? inferredWard?.id,
  };

  try {
    await client.query("BEGIN");

    const workflow = await deriveWorkflow(client, normalizedInput);

    const complaintResult = await client.query(
      `
        INSERT INTO complaints (
          complaint_code,
          citizen_id,
          domain_id,
          sub_problem_id,
          title,
          description,
          status,
          priority_level,
          is_emergency,
          department_id,
          ward_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, complaint_code, status, priority_level, submitted_at
      `,
      [
        complaintCode,
        normalizedInput.citizenId,
        normalizedInput.domainId ?? null,
        normalizedInput.subProblemId ?? null,
        normalizedInput.title,
        normalizedInput.description ?? null,
        workflow.status,
        workflow.priorityLevel,
        workflow.isEmergency,
        workflow.departmentId,
        normalizedInput.wardId ?? null,
      ],
    );

    const complaint = complaintResult.rows[0];

    await client.query(
      `
        INSERT INTO complaint_locations (
          complaint_id,
          latitude,
          longitude,
          address_line,
          landmark,
          city_name,
          state_name,
          postal_code,
          ward_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        complaint.id,
        normalizedInput.latitude,
        normalizedInput.longitude,
        normalizedInput.addressLine ?? null,
        normalizedInput.landmark ?? null,
        normalizedInput.cityName ?? null,
        normalizedInput.stateName ?? null,
        normalizedInput.postalCode ?? null,
        normalizedInput.wardId ?? null,
      ],
    );

    await client.query(
      `
        INSERT INTO complaint_status_history (
          complaint_id,
          old_status,
          new_status,
          changed_by,
          change_reason
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [complaint.id, null, "submitted", input.citizenId, "Complaint submitted by citizen"],
    );

    if (input.domainId) {
      await client.query(
        `
          INSERT INTO complaint_status_history (
            complaint_id,
            old_status,
            new_status,
            changed_by,
            change_reason
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          complaint.id,
          "submitted",
          "classified",
          input.citizenId,
          workflow.domainName ? `Complaint classified under ${workflow.domainName}` : "Complaint classified",
        ],
      );

      await client.query(
        `
          INSERT INTO complaint_status_history (
            complaint_id,
            old_status,
            new_status,
            changed_by,
            change_reason
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          complaint.id,
          "classified",
          workflow.status,
          input.citizenId,
          workflow.departmentId
            ? `Priority ${workflow.priorityLevel} and routed to department queue`
            : `Priority ${workflow.priorityLevel} assigned`,
        ],
      );
    }

    await createAuditLog(client, {
      actorUserId: normalizedInput.citizenId,
      entityType: "complaint",
      entityId: complaint.id,
      action: "complaint_created",
      details: {
        complaintCode,
        priorityLevel: workflow.priorityLevel,
        departmentId: workflow.departmentId,
        wardId: normalizedInput.wardId ?? null,
        isEmergency: workflow.isEmergency,
      },
    });

    await client.query("COMMIT");
    clearCache();
    return complaint;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listComplaints(): Promise<ComplaintListItem[]> {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.complaint_code AS "complaintCode",
        c.title,
        c.status,
        c.priority_level AS "priorityLevel",
        c.is_emergency AS "isEmergency",
        c.submitted_at AS "submittedAt",
        d.name AS "domainName",
        dept.name AS "departmentName",
        cl.address_line AS "addressLine",
        cl.landmark
      FROM complaints c
      LEFT JOIN domains d ON d.id = c.domain_id
      LEFT JOIN departments dept ON dept.id = c.department_id
      LEFT JOIN complaint_locations cl ON cl.complaint_id = c.id
      ORDER BY c.submitted_at DESC
    `,
  );

  return result.rows;
}

export async function listComplaintsByCitizen(citizenId: string): Promise<ComplaintListItem[]> {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.complaint_code AS "complaintCode",
        c.title,
        c.status,
        c.priority_level AS "priorityLevel",
        c.is_emergency AS "isEmergency",
        c.submitted_at AS "submittedAt",
        d.name AS "domainName",
        dept.name AS "departmentName",
        cl.address_line AS "addressLine",
        cl.landmark
      FROM complaints c
      LEFT JOIN domains d ON d.id = c.domain_id
      LEFT JOIN departments dept ON dept.id = c.department_id
      LEFT JOIN complaint_locations cl ON cl.complaint_id = c.id
      WHERE c.citizen_id = $1
      ORDER BY c.submitted_at DESC
    `,
    [citizenId],
  );

  return result.rows;
}

export async function listMapComplaints(options?: {
  publicOnly?: boolean;
  status?: string;
  domainId?: string;
  priorityLevel?: string;
  emergencyOnly?: boolean;
}): Promise<ComplaintMapItem[]> {
  const result = await db.query<ComplaintMapItem>(
    `
      SELECT
        c.id,
        c.complaint_code AS "complaintCode",
        c.title,
        c.status,
        c.priority_level AS "priorityLevel",
        c.is_emergency AS "isEmergency",
        d.name AS "domainName",
        dept.name AS "departmentName",
        w.name AS "wardName",
        cl.latitude::text AS latitude,
        cl.longitude::text AS longitude,
        cl.address_line AS "addressLine",
        cl.landmark,
        c.submitted_at AS "submittedAt"
      FROM complaints c
      LEFT JOIN domains d ON d.id = c.domain_id
      LEFT JOIN departments dept ON dept.id = c.department_id
      INNER JOIN complaint_locations cl ON cl.complaint_id = c.id
      LEFT JOIN wards w ON w.id = COALESCE(c.ward_id, cl.ward_id)
      WHERE ($1::boolean = FALSE OR c.status NOT IN ('rejected', 'duplicate', 'on_hold'))
        AND ($2::text IS NULL OR c.status = $2)
        AND ($3::uuid IS NULL OR c.domain_id = $3)
        AND ($4::text IS NULL OR c.priority_level = $4)
        AND ($5::boolean = FALSE OR c.is_emergency = TRUE)
      ORDER BY c.submitted_at DESC
    `,
    [
      options?.publicOnly ?? false,
      options?.status ?? null,
      options?.domainId ?? null,
      options?.priorityLevel ?? null,
      options?.emergencyOnly ?? false,
    ],
  );

  return result.rows;
}

export async function listPublicHotspots(): Promise<ComplaintHotspotItem[]> {
  const complaints = await listMapComplaints({ publicOnly: true });
  const hotspotMap = new Map<
    string,
    {
      latitudeSum: number;
      longitudeSum: number;
      complaintCount: number;
      criticalCount: number;
      emergencyCount: number;
      domainCounts: Map<string, number>;
    }
  >();

  for (const complaint of complaints) {
    const latitude = Number(complaint.latitude);
    const longitude = Number(complaint.longitude);
    const hotspotKey = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
    const current = hotspotMap.get(hotspotKey) ?? {
      latitudeSum: 0,
      longitudeSum: 0,
      complaintCount: 0,
      criticalCount: 0,
      emergencyCount: 0,
      domainCounts: new Map<string, number>(),
    };

    current.latitudeSum += latitude;
    current.longitudeSum += longitude;
    current.complaintCount += 1;
    current.criticalCount += complaint.priorityLevel === "P1" ? 1 : 0;
    current.emergencyCount += complaint.isEmergency ? 1 : 0;

    if (complaint.domainName) {
      current.domainCounts.set(complaint.domainName, (current.domainCounts.get(complaint.domainName) ?? 0) + 1);
    }

    hotspotMap.set(hotspotKey, current);
  }

  return [...hotspotMap.entries()]
    .map(([hotspotKey, value]) => {
      const topDomain =
        [...value.domainCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

      return {
        hotspotKey,
        latitude: value.latitudeSum / value.complaintCount,
        longitude: value.longitudeSum / value.complaintCount,
        complaintCount: value.complaintCount,
        criticalCount: value.criticalCount,
        emergencyCount: value.emergencyCount,
        topDomain,
      };
    })
    .sort((left, right) => right.complaintCount - left.complaintCount)
    .slice(0, 12);
}

export async function listNearbyComplaints(input: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  domainId?: string;
  publicOnly?: boolean;
}): Promise<NearbyComplaintItem[]> {
  const complaints = await listMapComplaints({
    publicOnly: input.publicOnly ?? true,
    domainId: input.domainId,
  });

  return complaints
    .map((complaint) => {
      const distanceKm = calculateDistanceKm(
        input.latitude,
        input.longitude,
        Number(complaint.latitude),
        Number(complaint.longitude),
      );

      return {
        id: complaint.id,
        complaintCode: complaint.complaintCode,
        title: complaint.title,
        status: complaint.status,
        priorityLevel: complaint.priorityLevel,
        domainName: complaint.domainName,
        distanceKm,
        addressLine: complaint.addressLine,
        landmark: complaint.landmark,
      };
    })
    .filter((complaint) => complaint.distanceKm <= input.radiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, 8);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [overviewResult, urgentQueueResult, departmentWorkloadResult] = await Promise.all([
    db.query<DashboardSummary["overview"]>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved', 'citizen_verified', 'rejected', 'duplicate'))::int AS "openComplaints",
          COUNT(*) FILTER (WHERE priority_level = 'P1' AND status NOT IN ('closed', 'resolved', 'citizen_verified', 'rejected', 'duplicate'))::int AS "criticalComplaints",
          COUNT(*) FILTER (
            WHERE status NOT IN ('closed', 'resolved', 'citizen_verified', 'rejected', 'duplicate')
              AND (
                reopened_count > 0
                OR submitted_at < NOW() - INTERVAL '24 hours'
              )
          )::int AS "slaRisk",
          COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE)::int AS "resolvedToday"
        FROM complaints
      `,
    ),
    db.query<DashboardSummary["urgentQueue"][number]>(
      `
        SELECT
          c.id,
          c.complaint_code AS "complaintCode",
          c.title,
          d.name AS "domainName",
          c.priority_level AS "priorityLevel",
          COALESCE(cl.address_line, cl.landmark, dept.name, 'Location pending') AS location,
          c.submitted_at AS "submittedAt"
        FROM complaints c
        LEFT JOIN domains d ON d.id = c.domain_id
        LEFT JOIN complaint_locations cl ON cl.complaint_id = c.id
        LEFT JOIN departments dept ON dept.id = c.department_id
        WHERE c.status NOT IN ('closed', 'resolved', 'citizen_verified', 'rejected', 'duplicate')
        ORDER BY
          CASE c.priority_level
            WHEN 'P1' THEN 1
            WHEN 'P2' THEN 2
            WHEN 'P3' THEN 3
            ELSE 4
          END,
          c.submitted_at ASC
        LIMIT 5
      `,
    ),
    db.query<DashboardSummary["departmentWorkload"][number]>(
      `
        SELECT
          COALESCE(dept.name, 'Unassigned') AS "departmentName",
          COUNT(*)::int AS "pendingCount"
        FROM complaints c
        LEFT JOIN departments dept ON dept.id = c.department_id
        WHERE c.status NOT IN ('closed', 'resolved', 'citizen_verified', 'rejected', 'duplicate')
        GROUP BY COALESCE(dept.name, 'Unassigned')
        ORDER BY "pendingCount" DESC, "departmentName" ASC
        LIMIT 6
      `,
    ),
  ]);

  return {
    overview: overviewResult.rows[0] ?? {
      openComplaints: 0,
      criticalComplaints: 0,
      slaRisk: 0,
      resolvedToday: 0,
    },
    urgentQueue: urgentQueueResult.rows,
    departmentWorkload: departmentWorkloadResult.rows,
  };
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [trendRows, domainRows, departmentRows, kpiRows] = await Promise.all([
    db.query<AnalyticsSummary["trends"][number]>(
      `
        WITH days AS (
          SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
        )
        SELECT
          to_char(days.day, 'YYYY-MM-DD') AS day,
          COUNT(c.id) FILTER (WHERE c.submitted_at::date = days.day)::int AS "reportedCount",
          COUNT(c.id) FILTER (WHERE c.resolved_at IS NOT NULL AND c.resolved_at::date = days.day)::int AS "resolvedCount"
        FROM days
        LEFT JOIN complaints c
          ON c.submitted_at::date = days.day
          OR (c.resolved_at IS NOT NULL AND c.resolved_at::date = days.day)
        GROUP BY days.day
        ORDER BY days.day ASC
      `,
    ),
    db.query<AnalyticsSummary["domainBreakdown"][number]>(
      `
        SELECT
          COALESCE(d.name, 'Unclassified') AS "domainName",
          COUNT(*)::int AS "complaintCount"
        FROM complaints c
        LEFT JOIN domains d ON d.id = c.domain_id
        GROUP BY COALESCE(d.name, 'Unclassified')
        ORDER BY "complaintCount" DESC, "domainName" ASC
        LIMIT 8
      `,
    ),
    db.query<AnalyticsSummary["departmentPerformance"][number]>(
      `
        SELECT
          COALESCE(dept.name, 'Unassigned') AS "departmentName",
          COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL)::int AS "resolvedCount",
          COUNT(*) FILTER (WHERE c.status NOT IN ('closed', 'resolved', 'citizen_verified', 'rejected', 'duplicate'))::int AS "pendingCount",
          COALESCE(
            ROUND(
              AVG(
                EXTRACT(EPOCH FROM (c.resolved_at - c.submitted_at)) / 3600
              ) FILTER (WHERE c.resolved_at IS NOT NULL)
            , 2),
            0
          )::float AS "averageResolutionHours"
        FROM complaints c
        LEFT JOIN departments dept ON dept.id = c.department_id
        GROUP BY COALESCE(dept.name, 'Unassigned')
        ORDER BY "pendingCount" DESC, "resolvedCount" DESC
        LIMIT 8
      `,
    ),
    db.query<AnalyticsSummary["kpis"]>(
      `
        SELECT
          COUNT(*) FILTER (WHERE is_emergency = TRUE)::int AS "emergencyCount",
          COUNT(*) FILTER (WHERE reopened_count > 0)::int AS "reopenedCount",
          COUNT(*) FILTER (WHERE reopened_count > 1)::int AS "repeatComplaintRiskCount",
          COUNT(*) FILTER (
            WHERE status NOT IN ('closed', 'resolved', 'citizen_verified', 'rejected', 'duplicate')
              AND submitted_at < NOW() - INTERVAL '24 hours'
          )::int AS "slaBreaches"
        FROM complaints
      `,
    ),
  ]);

  return {
    trends: trendRows.rows,
    domainBreakdown: domainRows.rows,
    departmentPerformance: departmentRows.rows,
    kpis: kpiRows.rows[0] ?? {
      emergencyCount: 0,
      reopenedCount: 0,
      repeatComplaintRiskCount: 0,
      slaBreaches: 0,
    },
  };
}

export async function exportAnalyticsCsv() {
  const analytics = await getAnalyticsSummary();
  const lines = [
    "section,name,value,secondary",
    ...analytics.domainBreakdown.map((row) => `domain,${row.domainName},${row.complaintCount},`),
    ...analytics.departmentPerformance.map(
      (row) =>
        `department,${row.departmentName},${row.pendingCount},avg_resolution_hours:${row.averageResolutionHours}`,
    ),
    ...analytics.trends.map((row) => `trend,${row.day},reported:${row.reportedCount},resolved:${row.resolvedCount}`),
    `kpi,emergency_count,${analytics.kpis.emergencyCount},`,
    `kpi,reopened_count,${analytics.kpis.reopenedCount},`,
    `kpi,repeat_risk_count,${analytics.kpis.repeatComplaintRiskCount},`,
    `kpi,sla_breaches,${analytics.kpis.slaBreaches},`,
  ];

  return lines.join("\n");
}

export async function getComplaintById(id: string): Promise<ComplaintDetail | null> {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.complaint_code AS "complaintCode",
        c.title,
        c.description,
        c.status,
        c.priority_level AS "priorityLevel",
        c.is_emergency AS "isEmergency",
        c.submitted_at AS "submittedAt",
        c.department_id AS "departmentId",
        c.ward_id AS "wardId",
        c.citizen_id AS "citizenId",
        d.name AS "domainName",
        dept.name AS "departmentName",
        cl.latitude,
        cl.longitude,
        cl.address_line AS "addressLine",
        cl.landmark
      FROM complaints c
      LEFT JOIN domains d ON d.id = c.domain_id
      LEFT JOIN departments dept ON dept.id = c.department_id
      LEFT JOIN complaint_locations cl ON cl.complaint_id = c.id
      WHERE c.id = $1 OR c.complaint_code = $1
      LIMIT 1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function getComplaintStatusHistory(id: string): Promise<ComplaintStatusHistoryItem[]> {
  const result = await db.query(
    `
      SELECT
        csh.id,
        csh.complaint_id AS "complaintId",
        csh.old_status AS "oldStatus",
        csh.new_status AS "newStatus",
        csh.changed_by AS "changedBy",
        csh.change_reason AS "changeReason",
        csh.created_at AS "createdAt"
      FROM complaint_status_history csh
      INNER JOIN complaints c ON c.id = csh.complaint_id
      WHERE c.id = $1 OR c.complaint_code = $1
      ORDER BY csh.created_at ASC
    `,
    [id],
  );

  return result.rows;
}

export async function uploadComplaintMedia(input: UploadComplaintMediaInput): Promise<ComplaintMediaItem | null> {
  const complaintResult = await db.query(
    `
      SELECT id
      FROM complaints
      WHERE id = $1 OR complaint_code = $1
      LIMIT 1
    `,
    [input.complaintId],
  );

  const complaint = complaintResult.rows[0];

  if (!complaint) {
    return null;
  }

  const result = await db.query(
    `
      INSERT INTO complaint_media (
        complaint_id,
        uploaded_by,
        media_type,
        file_path,
        file_url,
        mime_type,
        is_resolution_proof
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        complaint_id AS "complaintId",
        media_type AS "mediaType",
        file_url AS "fileUrl",
        mime_type AS "mimeType",
        is_resolution_proof AS "isResolutionProof",
        created_at AS "createdAt"
    `,
    [
      complaint.id,
      input.uploadedBy ?? null,
      input.mediaType,
      input.filePath,
      input.fileUrl,
      input.mimeType ?? null,
      input.isResolutionProof ?? false,
    ],
  );

  return result.rows[0] ?? null;
}

export async function listComplaintMedia(id: string): Promise<ComplaintMediaItem[]> {
  const result = await db.query(
    `
      SELECT
        cm.id,
        cm.complaint_id AS "complaintId",
        cm.media_type AS "mediaType",
        cm.file_url AS "fileUrl",
        cm.mime_type AS "mimeType",
        cm.is_resolution_proof AS "isResolutionProof",
        cm.created_at AS "createdAt"
      FROM complaint_media cm
      INNER JOIN complaints c ON c.id = cm.complaint_id
      WHERE c.id = $1 OR c.complaint_code = $1
      ORDER BY cm.created_at ASC
    `,
    [id],
  );

  return result.rows;
}

export async function listComplaintFeedback(id: string): Promise<ComplaintFeedbackItem[]> {
  const result = await db.query(
    `
      SELECT
        f.id,
        f.complaint_id AS "complaintId",
        f.citizen_id AS "citizenId",
        f.rating,
        f.comment,
        f.reopen_requested AS "reopenRequested",
        f.created_at AS "createdAt"
      FROM feedback f
      INNER JOIN complaints c ON c.id = f.complaint_id
      WHERE c.id = $1 OR c.complaint_code = $1
      ORDER BY f.created_at DESC
    `,
    [id],
  );

  return result.rows;
}

export async function listNotificationsByUser(userId: string): Promise<ComplaintNotificationItem[]> {
  const result = await db.query(
    `
      SELECT
        n.id,
        n.user_id AS "userId",
        n.complaint_id AS "complaintId",
        n.title,
        n.message,
        n.notification_type AS "notificationType",
        n.is_read AS "isRead",
        n.created_at AS "createdAt"
      FROM notifications n
      WHERE n.user_id = $1
      ORDER BY n.is_read ASC, n.created_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const result = await db.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        user_id AS "userId",
        complaint_id AS "complaintId",
        title,
        message,
        notification_type AS "notificationType",
        is_read AS "isRead",
        created_at AS "createdAt"
    `,
    [notificationId, userId],
  );

  return result.rows[0] ?? null;
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await db.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
        AND is_read = FALSE
      RETURNING id
    `,
    [userId],
  );

  return {
    userId,
    updatedCount: result.rowCount ?? 0,
  };
}

export async function listAssignmentsByOfficer(userId: string): Promise<ComplaintAssignmentItem[]> {
  const result = await db.query(
    `
      SELECT
        a.id,
        a.complaint_id AS "complaintId",
        c.complaint_code AS "complaintCode",
        c.title AS "complaintTitle",
        a.department_id AS "departmentId",
        d.name AS "departmentName",
        a.assigned_to_user_id AS "assignedToUserId",
        assigned_to.full_name AS "assignedToName",
        a.assigned_by_user_id AS "assignedByUserId",
        assigned_by.full_name AS "assignedByName",
        a.assignment_status AS "assignmentStatus",
        a.assigned_at AS "assignedAt",
        a.accepted_at AS "acceptedAt",
        a.completed_at AS "completedAt",
        COUNT(cm.id)::int AS "resolutionProofCount",
        a.notes
      FROM assignments a
      INNER JOIN complaints c ON c.id = a.complaint_id
      INNER JOIN departments d ON d.id = a.department_id
      LEFT JOIN users assigned_to ON assigned_to.id = a.assigned_to_user_id
      LEFT JOIN users assigned_by ON assigned_by.id = a.assigned_by_user_id
      LEFT JOIN complaint_media cm
        ON cm.complaint_id = a.complaint_id
        AND cm.is_resolution_proof = TRUE
      WHERE a.assigned_to_user_id = $1
      GROUP BY
        a.id,
        c.complaint_code,
        c.title,
        d.name,
        assigned_to.full_name,
        assigned_by.full_name
      ORDER BY
        CASE a.assignment_status
          WHEN 'assigned' THEN 1
          WHEN 'accepted' THEN 2
          WHEN 'in_progress' THEN 3
          ELSE 4
        END,
        a.assigned_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function listComplaintAssignments(id: string): Promise<ComplaintAssignmentItem[]> {
  const result = await db.query(
    `
      SELECT
        a.id,
        a.complaint_id AS "complaintId",
        c.complaint_code AS "complaintCode",
        c.title AS "complaintTitle",
        a.department_id AS "departmentId",
        d.name AS "departmentName",
        a.assigned_to_user_id AS "assignedToUserId",
        assigned_to.full_name AS "assignedToName",
        a.assigned_by_user_id AS "assignedByUserId",
        assigned_by.full_name AS "assignedByName",
        a.assignment_status AS "assignmentStatus",
        a.assigned_at AS "assignedAt",
        a.accepted_at AS "acceptedAt",
        a.completed_at AS "completedAt",
        COUNT(cm.id)::int AS "resolutionProofCount",
        a.notes
      FROM assignments a
      INNER JOIN complaints c ON c.id = a.complaint_id
      INNER JOIN departments d ON d.id = a.department_id
      LEFT JOIN users assigned_to ON assigned_to.id = a.assigned_to_user_id
      LEFT JOIN users assigned_by ON assigned_by.id = a.assigned_by_user_id
      LEFT JOIN complaint_media cm
        ON cm.complaint_id = a.complaint_id
        AND cm.is_resolution_proof = TRUE
      WHERE c.id = $1 OR c.complaint_code = $1
      GROUP BY
        a.id,
        c.complaint_code,
        c.title,
        d.name,
        assigned_to.full_name,
        assigned_by.full_name
      ORDER BY a.assigned_at DESC
    `,
    [id],
  );

  return result.rows;
}

export async function getAssignmentById(assignmentId: string) {
  const result = await db.query(
    `
      SELECT
        a.id,
        a.complaint_id AS "complaintId",
        a.department_id AS "departmentId",
        a.assigned_to_user_id AS "assignedToUserId",
        a.assigned_by_user_id AS "assignedByUserId",
        a.assignment_status AS "assignmentStatus",
        c.status AS "complaintStatus"
      FROM assignments a
      INNER JOIN complaints c ON c.id = a.complaint_id
      WHERE a.id = $1
      LIMIT 1
    `,
    [assignmentId],
  );

  return result.rows[0] ?? null;
}

export async function complaintHasResolutionProof(complaintId: string) {
  const result = await db.query<{ hasProof: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM complaint_media
        WHERE complaint_id = $1
          AND is_resolution_proof = TRUE
      ) AS "hasProof"
    `,
    [complaintId],
  );

  return result.rows[0]?.hasProof ?? false;
}

export async function hasOfficerAssignment(complaintId: string, officerId: string) {
  const result = await db.query<{ hasAssignment: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM assignments
        WHERE complaint_id = $1
          AND assigned_to_user_id = $2
      ) AS "hasAssignment"
    `,
    [complaintId, officerId],
  );

  return result.rows[0]?.hasAssignment ?? false;
}

export async function listComplaintNotes(id: string): Promise<ComplaintNoteItem[]> {
  const result = await db.query(
    `
      SELECT
        cn.id,
        cn.complaint_id AS "complaintId",
        cn.author_id AS "authorId",
        cn.note_type AS "noteType",
        cn.note_text AS "noteText",
        cn.is_internal AS "isInternal",
        cn.created_at AS "createdAt",
        u.full_name AS "authorName"
      FROM complaint_notes cn
      INNER JOIN complaints c ON c.id = cn.complaint_id
      LEFT JOIN users u ON u.id = cn.author_id
      WHERE c.id = $1 OR c.complaint_code = $1
      ORDER BY cn.created_at DESC
    `,
    [id],
  );

  return result.rows;
}

export async function createComplaintNote(input: CreateComplaintNoteInput): Promise<ComplaintNoteItem | null> {
  const complaintResult = await db.query(
    `
      SELECT id
      FROM complaints
      WHERE id = $1 OR complaint_code = $1
      LIMIT 1
    `,
    [input.complaintId],
  );

  const complaint = complaintResult.rows[0];

  if (!complaint) {
    return null;
  }

  const result = await db.query(
    `
      INSERT INTO complaint_notes (
        complaint_id,
        author_id,
        note_type,
        note_text,
        is_internal
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        complaint_id AS "complaintId",
        author_id AS "authorId",
        note_type AS "noteType",
        note_text AS "noteText",
        is_internal AS "isInternal",
        created_at AS "createdAt"
    `,
    [
      complaint.id,
      input.authorId,
      input.noteType,
      input.noteText,
      input.isInternal ?? true,
    ],
  );

  const note = result.rows[0];

  if (!note) {
    return null;
  }

  const authorResult = await db.query<{ fullName: string }>(
    `
      SELECT full_name AS "fullName"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [input.authorId],
  );

  await writeAuditLog({
    actorUserId: input.authorId,
    entityType: "complaint_note",
    entityId: note.id,
    action: "complaint_note_created",
    details: {
      complaintId: complaint.id,
      noteType: input.noteType,
      isInternal: input.isInternal ?? true,
    },
  });
  clearCache();

  return {
    ...note,
    authorName: authorResult.rows[0]?.fullName ?? null,
  };
}

export async function submitComplaintFeedback(input: SubmitComplaintFeedbackInput): Promise<ComplaintFeedbackItem | null> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const complaintResult = await client.query(
      `
        SELECT id, status
        FROM complaints
        WHERE id = $1 OR complaint_code = $1
        LIMIT 1
      `,
      [input.complaintId],
    );

    const complaint = complaintResult.rows[0];

    if (!complaint) {
      await client.query("ROLLBACK");
      return null;
    }

    const feedbackResult = await client.query(
      `
        INSERT INTO feedback (
          complaint_id,
          citizen_id,
          rating,
          comment,
          reopen_requested
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          complaint_id AS "complaintId",
          citizen_id AS "citizenId",
          rating,
          comment,
          reopen_requested AS "reopenRequested",
          created_at AS "createdAt"
      `,
      [
        complaint.id,
        input.citizenId,
        input.rating ?? null,
        input.comment ?? null,
        input.reopenRequested ?? false,
      ],
    );

    if (input.reopenRequested) {
      await client.query(
        `
          UPDATE complaints
          SET
            status = 'reopened',
            updated_at = NOW(),
            reopened_count = reopened_count + 1
          WHERE id = $1
        `,
        [complaint.id],
      );

      await client.query(
        `
          INSERT INTO complaint_status_history (
            complaint_id,
            old_status,
            new_status,
            changed_by,
            change_reason
          )
          VALUES ($1, $2, 'reopened', $3, $4)
        `,
        [
          complaint.id,
          complaint.status,
          input.citizenId,
          input.comment?.trim() || "Complaint reopened by citizen after follow-up feedback",
        ],
      );

      const ownerResult = await client.query<{ assignedByUserId: string | null }>(
        `
          SELECT assigned_by_user_id AS "assignedByUserId"
          FROM assignments
          WHERE complaint_id = $1
          ORDER BY assigned_at DESC
          LIMIT 1
        `,
        [complaint.id],
      );

      if (ownerResult.rows[0]?.assignedByUserId) {
        await createNotification(client, {
          userId: ownerResult.rows[0].assignedByUserId,
          complaintId: complaint.id,
          title: "Complaint reopened by citizen",
          message: input.comment?.trim() || "A citizen reopened the complaint after follow-up.",
          notificationType: "complaint_reopened",
        });
      }
    }

    await createAuditLog(client, {
      actorUserId: input.citizenId,
      entityType: "feedback",
      entityId: feedbackResult.rows[0]?.id ?? null,
      action: input.reopenRequested ? "complaint_reopened_by_feedback" : "complaint_feedback_submitted",
      details: {
        complaintId: complaint.id,
        rating: input.rating ?? null,
      },
    });

    await client.query("COMMIT");
    clearCache();
    return feedbackResult.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateComplaintStatus(input: UpdateComplaintStatusInput) {
  const currentResult = await db.query(
    `
      SELECT id, status
      FROM complaints
      WHERE id = $1 OR complaint_code = $1
      LIMIT 1
    `,
    [input.complaintId],
  );

  const currentComplaint = currentResult.rows[0];

  if (!currentComplaint) {
    return null;
  }

  const updatedResult = await db.query(
    `
      UPDATE complaints
      SET
        status = $2,
        updated_at = NOW(),
        resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END,
        closed_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE closed_at END,
        reopened_count = CASE WHEN $2 = 'reopened' THEN reopened_count + 1 ELSE reopened_count END
      WHERE id = $1
      RETURNING id, complaint_code AS "complaintCode", status, updated_at AS "updatedAt"
    `,
    [currentComplaint.id, input.newStatus],
  );

  await db.query(
    `
      INSERT INTO complaint_status_history (
        complaint_id,
        old_status,
        new_status,
        changed_by,
        change_reason
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      currentComplaint.id,
      currentComplaint.status,
      input.newStatus,
      input.changedBy,
      input.reason ?? null,
    ],
  );

  await writeAuditLog({
    actorUserId: input.changedBy,
    entityType: "complaint",
    entityId: currentComplaint.id,
    action: "complaint_status_updated",
    details: {
      newStatus: input.newStatus,
      oldStatus: currentComplaint.status,
    },
  });
  clearCache();

  return updatedResult.rows[0];
}

export async function updateAssignmentStatus(input: UpdateAssignmentStatusInput) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const assignmentResult = await client.query(
      `
        SELECT
          a.id,
          a.complaint_id AS "complaintId",
          a.assignment_status AS "assignmentStatus",
          a.assigned_to_user_id AS "assignedToUserId",
          a.assigned_by_user_id AS "assignedByUserId",
          c.status AS "complaintStatus",
          c.citizen_id AS "citizenId",
          c.complaint_code AS "complaintCode"
        FROM assignments a
        INNER JOIN complaints c ON c.id = a.complaint_id
        WHERE a.id = $1
        LIMIT 1
      `,
      [input.assignmentId],
    );

    const assignment = assignmentResult.rows[0];

    if (!assignment) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        UPDATE assignments
        SET
          assignment_status = $2,
          accepted_at = CASE WHEN $2 = 'accepted' AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,
          completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END,
          notes = COALESCE($3, notes)
        WHERE id = $1
      `,
      [input.assignmentId, input.newStatus, input.notes ?? null],
    );

    let complaintStatus = assignment.complaintStatus as string;
    if (input.newStatus === "accepted") complaintStatus = "accepted";
    if (input.newStatus === "in_progress") complaintStatus = "in_progress";
    if (input.newStatus === "completed") complaintStatus = "resolved";

    await client.query(
      `
        UPDATE complaints
        SET
          status = $2,
          updated_at = NOW(),
          resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END
        WHERE id = $1
      `,
      [assignment.complaintId, complaintStatus],
    );

    await client.query(
      `
        INSERT INTO complaint_status_history (
          complaint_id,
          old_status,
          new_status,
          changed_by,
          change_reason
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        assignment.complaintId,
        assignment.complaintStatus,
        complaintStatus,
        input.changedByUserId,
        input.notes ??
          (input.newStatus === "completed"
            ? "Field officer marked the assignment as completed"
            : `Assignment updated to ${input.newStatus}`),
      ],
    );

    await createNotification(client, {
      userId: assignment.citizenId,
      complaintId: assignment.complaintId,
      title:
        input.newStatus === "completed"
          ? "Complaint resolved by field team"
          : input.newStatus === "in_progress"
            ? "Field work started"
            : "Assignment accepted",
      message:
        input.newStatus === "completed"
          ? `Complaint ${assignment.complaintCode} was marked resolved and is ready for your review.`
          : input.newStatus === "in_progress"
            ? `Field work has started for complaint ${assignment.complaintCode}.`
            : `A field officer accepted complaint ${assignment.complaintCode}.`,
      notificationType:
        input.newStatus === "completed"
          ? "complaint_resolved"
          : input.newStatus === "in_progress"
            ? "field_work_started"
            : "assignment_accepted",
    });

    if (assignment.assignedByUserId) {
      await createNotification(client, {
        userId: assignment.assignedByUserId,
        complaintId: assignment.complaintId,
        title:
          input.newStatus === "completed"
            ? "Field team completed work"
            : input.newStatus === "in_progress"
              ? "Field team started work"
              : input.newStatus === "reassigned"
                ? "Assignment was reassigned"
                : "Field team accepted assignment",
        message:
          input.newStatus === "completed"
            ? `The field team completed complaint ${assignment.complaintCode}. Citizen verification can begin.`
            : input.newStatus === "in_progress"
              ? `A field officer started work on complaint ${assignment.complaintCode}.`
              : input.newStatus === "reassigned"
                ? `Complaint ${assignment.complaintCode} was flagged for reassignment.`
                : `A field officer accepted complaint ${assignment.complaintCode}.`,
        notificationType:
          input.newStatus === "completed"
            ? "field_work_completed"
            : input.newStatus === "in_progress"
              ? "field_work_started_internal"
              : input.newStatus === "reassigned"
                ? "assignment_reassigned"
                : "assignment_accepted_internal",
      });
    }

    await createAuditLog(client, {
      actorUserId: input.changedByUserId,
      entityType: "assignment",
      entityId: assignment.id,
      action: "assignment_status_updated",
      details: {
        complaintId: assignment.complaintId,
        oldStatus: assignment.assignmentStatus,
        newStatus: input.newStatus,
        complaintStatus,
      },
    });

    await client.query("COMMIT");
    clearCache();

    return {
      id: assignment.id,
      complaintId: assignment.complaintId,
      assignmentStatus: input.newStatus,
      complaintStatus,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyComplaintByCitizen(input: {
  complaintId: string;
  citizenId: string;
  comment?: string;
}) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const complaintResult = await client.query(
      `
        SELECT id, status, complaint_code AS "complaintCode"
        FROM complaints
        WHERE (id = $1 OR complaint_code = $1) AND citizen_id = $2
        LIMIT 1
      `,
      [input.complaintId, input.citizenId],
    );

    const complaint = complaintResult.rows[0];

    if (!complaint) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        UPDATE complaints
        SET
          status = 'citizen_verified',
          updated_at = NOW()
        WHERE id = $1
      `,
      [complaint.id],
    );

    await client.query(
      `
        INSERT INTO complaint_status_history (
          complaint_id,
          old_status,
          new_status,
          changed_by,
          change_reason
        )
        VALUES ($1, $2, 'citizen_verified', $3, $4)
      `,
      [
        complaint.id,
        complaint.status,
        input.citizenId,
        input.comment?.trim() || "Citizen confirmed that the issue is resolved",
      ],
    );

    const ownerResult = await client.query<{ assignedByUserId: string | null }>(
      `
        SELECT assigned_by_user_id AS "assignedByUserId"
        FROM assignments
        WHERE complaint_id = $1
        ORDER BY assigned_at DESC
        LIMIT 1
      `,
      [complaint.id],
    );

    if (ownerResult.rows[0]?.assignedByUserId) {
      await createNotification(client, {
        userId: ownerResult.rows[0].assignedByUserId,
        complaintId: complaint.id,
        title: "Citizen verified resolution",
        message: `Complaint ${complaint.complaintCode} was verified by the citizen.`,
        notificationType: "citizen_verified",
      });
    }

    await createAuditLog(client, {
      actorUserId: input.citizenId,
      entityType: "complaint",
      entityId: complaint.id,
      action: "complaint_verified_by_citizen",
      details: {
        oldStatus: complaint.status,
      },
    });

    await client.query("COMMIT");
    clearCache();

    return {
      complaintId: complaint.id,
      status: "citizen_verified",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function assignComplaint(input: AssignComplaintInput) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const complaintResult = await client.query(
      `
        SELECT id, status, citizen_id AS "citizenId", complaint_code AS "complaintCode"
        FROM complaints
        WHERE id = $1 OR complaint_code = $1
        LIMIT 1
      `,
      [input.complaintId],
    );

    const complaint = complaintResult.rows[0];

    if (!complaint) {
      await client.query("ROLLBACK");
      return null;
    }

    const assignmentResult = await client.query(
      `
        INSERT INTO assignments (
          complaint_id,
          department_id,
          assigned_to_user_id,
          assigned_by_user_id,
          assignment_status,
          notes
        )
        VALUES ($1, $2, $3, $4, 'assigned', $5)
        RETURNING id, complaint_id AS "complaintId", department_id AS "departmentId", assigned_at AS "assignedAt"
      `,
      [
        complaint.id,
        input.departmentId,
        input.assignedToUserId ?? null,
        input.assignedByUserId,
        input.notes ?? null,
      ],
    );

    await client.query(
      `
        UPDATE complaints
        SET
          department_id = $2,
          status = 'assigned',
          updated_at = NOW()
        WHERE id = $1
      `,
      [complaint.id, input.departmentId],
    );

    await client.query(
      `
        INSERT INTO complaint_status_history (
          complaint_id,
          old_status,
          new_status,
          changed_by,
          change_reason
        )
        VALUES ($1, $2, 'assigned', $3, $4)
      `,
      [
        complaint.id,
        complaint.status,
        input.assignedByUserId,
        input.notes ?? "Complaint assigned to department",
      ],
    );

    await createNotification(client, {
      userId: complaint.citizenId,
      complaintId: complaint.id,
      title: "Complaint assigned",
      message: `Complaint ${complaint.complaintCode} has been assigned to a department team.`,
      notificationType: "complaint_assigned",
    });

    if (input.assignedToUserId) {
      await createNotification(client, {
        userId: input.assignedToUserId,
        complaintId: complaint.id,
        title: "New field assignment",
        message: `You were assigned complaint ${complaint.complaintCode}.`,
        notificationType: "field_assignment",
      });
    }

    await createAuditLog(client, {
      actorUserId: input.assignedByUserId,
      entityType: "assignment",
      entityId: assignmentResult.rows[0]?.id ?? null,
      action: "complaint_assigned",
      details: {
        complaintId: complaint.id,
        departmentId: input.departmentId,
        assignedToUserId: input.assignedToUserId ?? null,
      },
    });

    await client.query("COMMIT");
    clearCache();
    return assignmentResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
