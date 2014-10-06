#!/usr/bin/env python
import csv
import json

KEYS = (
    #'vendor_id', 'rate_code',
    #'pickup_datetime', 'dropoff_datetime',
    'trip_time_in_secs', 'trip_distance',
    'pickup_longitude', 'pickup_latitude',
    'dropoff_longitude', 'dropoff_latitude',
)


def extract_data(fname):
    trips = []
    with open(fname, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trip = {k: row[k] for k in KEYS}
            trips.append(trip)
    return trips


if __name__ == '__main__':
    data = extract_data('test.csv')
    json_data = json.dumps(data)
    with open('js/trips.js', 'w+') as f:
        f.write('TRIPS = ')
        f.write(json_data)
