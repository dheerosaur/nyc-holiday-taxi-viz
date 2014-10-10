#!/usr/bin/env python
import glob
import csv

KEYS = (
    'vendor_id', 'rate_code',
    'pickup_datetime', 'dropoff_datetime',
    'trip_time_in_secs', 'passenger_count',
    'pickup_longitude', 'pickup_latitude',
    'dropoff_longitude', 'dropoff_latitude',
)


def extract_data(path):
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield {k: row[k] for k in KEYS}


def process_csv_files():
    with open('data.csv', 'w+') as f:
        writer = csv.DictWriter(f, KEYS)
        writer.writeheader()
        for path in glob.glob('csvs/*'):
            rows = extract_data(path)
            writer.writerows(rows)


if __name__ == '__main__':
    process_csv_files()
