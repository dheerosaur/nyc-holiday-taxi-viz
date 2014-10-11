#!/usr/bin/env python
import glob
import csv
from math import radians, cos, sin, asin, sqrt

READ_KEYS = (
    'vendor_id', 'rate_code',
    'pickup_datetime', 'dropoff_datetime',
    'trip_time_in_secs', 'passenger_count',
    'pickup_longitude', 'pickup_latitude',
    'dropoff_longitude', 'dropoff_latitude',
)

WRITE_KEYS = READ_KEYS + (
    'terminal', 'terminal_distance'
)

TERMINALS = (
    ('EWR A', 100, 40.687819, -74.182653),
    ('EWR B', 100, 40.690580, -74.177597),
    ('EWR C', 100, 40.695255, -74.177720),
    ('JFK T1', 100, 40.643190, -73.789867),
    ('JFK T23', 100, 40.641530, -73.787875),
    ('JFK T4', 100, 40.644429, -73.782924),
    ('JFK T5', 100, 40.645795, -73.776379),
    ('JFK T7', 100, 40.648586, -73.782909),
    ('JFK T8', 100, 40.646870, -73.789999),
    ('LGA A', 70, 40.773130, -73.885406),
    ('LGA B', 50, 40.774210, -73.872263),
    ('LGA C', 40, 40.771111, -73.865579),
    ('LGA D', 30, 40.768477, -73.862196),
)


def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)

    From: http://stackoverflow.com/q/4913349/438838
    """
    # convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))

    # 6367 km is the radius of the Earth
    meters = 6367 * 1000 * c
    return meters


def get_nearest(cab_data):
    pickup_lat = float(cab_data['pickup_latitude'])
    pickup_lng = float(cab_data['pickup_longitude'])
    nearest = min((haversine(pickup_lng, pickup_lat, lng, lat), terminal)
                  for terminal, rng, lat, lng in TERMINALS)
    return {
        'terminal_distance': int(nearest[0]),
        'terminal': nearest[1],
    }


def extract_data(path):
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data = {k: row[k] for k in READ_KEYS}
            data.update(get_nearest(data))
            yield data


def process_csv_files():
    with open('data.csv', 'w+') as f:
        writer = csv.DictWriter(f, WRITE_KEYS)
        writer.writeheader()
        for path in glob.glob('csvs/*'):
            rows = extract_data(path)
            writer.writerows(rows)


if __name__ == '__main__':
    process_csv_files()
