#!/usr/bin/env python
import csv
import json
import requests

from .config import GOOGLE_API_KEY, MAPQUEST_API_KEY

GOOGLE_DIRECTIONS = 'https://maps.googleapis.com/maps/api/directions/json'
MAPQUEST_DIRECTIONS = 'http://open.mapquestapi.com/directions/v2/route'

READ_KEYS = (
    'vendor_id', 'rate_code', 'pickup_datetime',
    'trip_time_in_secs', 'passenger_count',
    'pickup_longitude', 'pickup_latitude',
    'dropoff_longitude', 'dropoff_latitude',
    'terminal',
)

WRITE_KEYS = (
    'vendor', 'pickupTime', 'duration',
    'terminal', 'direction',
)


def get_google_polyline(value):
    value = json.loads(value)
    return value['routes'][0]['overview_polyline']['points']


def get_mapquest_polyline(value):
    value = json.loads(value)
    return value['route']['shape']['shapePoints']


def get_pickup_dropoff(data):
    return (
        '{},{}'.format(data['pickup_latitude'], data['pickup_longitude']),
        '{},{}'.format(data['dropoff_latitude'], data['dropoff_longitude'])
    )


def get_google_direction(data):
    pickup, dropoff = get_pickup_dropoff(data)
    params = dict(origin=pickup, destination=dropoff, key=GOOGLE_API_KEY)
    resp = requests.get(url=GOOGLE_DIRECTIONS, params=params)
    if resp.status_code == 200:
        return get_google_polyline(resp.content)
    return 'route-error'


def get_mapquest_direction(data):
    pickup, dropoff = get_pickup_dropoff(data)
    params = {
        'from': pickup, 'to': dropoff, 'key': MAPQUEST_API_KEY,
        'fullShape': 'true', 'shapeFormat': 'cmp', 'manMaps': 'false',
        'narrativeType': 'none', 'doReverseGeocode': 'false',
    }
    resp = requests.get(url=MAPQUEST_DIRECTIONS, params=params)
    if resp.status_code == 200:
        return get_mapquest_polyline(resp.content)
    return 'route-error'


def record_error(row):
    with open('errors.csv', 'a') as f:
        writer = csv.DictWriter(f, READ_KEYS)
        writer.writerow(row)


def extract_data(path):
    with open(path, 'r') as f:
        reader = csv.DictReader(f, fieldnames=READ_KEYS)
        for row in reader:
            data = {
                'vendor': row['vendor_id'],
                'pickupTime': row['pickup_datetime'],
                'duration': row['trip_time_in_secs'],
                'terminal': row['terminal'],
                'direction': 'error',
            }
            try:
                data['direction'] = get_mapquest_direction(row)
            except:
                record_error(row)
            yield data


def write_with_directions():
    with open('with_directions.csv', 'w+') as f:
        writer = csv.DictWriter(f, WRITE_KEYS)
        rows = extract_data('sample.csv')
        for row in rows:
            writer.writerow(row)


if __name__ == '__main__':
    write_with_directions()
