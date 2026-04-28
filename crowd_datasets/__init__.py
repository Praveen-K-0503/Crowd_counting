# build dataset according to given 'dataset_file'
def build_dataset(args):
    dataset_file = args.dataset_file.upper()
    if dataset_file == 'SHHA':
        from crowd_datasets.SHHA.loading_data import loading_data
        return loading_data

    raise ValueError(f"Unsupported dataset_file: {args.dataset_file}. Use SHHA.")
