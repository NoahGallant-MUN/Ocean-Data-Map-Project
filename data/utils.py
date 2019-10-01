#!/usr/bin/env python

import datetime
import os
import re
import uuid
import warnings
import zipfile

import cftime
import dateutil.parser
import geopy
import netCDF4
import numpy as np
import pandas
import pint
import pyresample
import xarray as xr
from cachetools import TTLCache
from flask_babel import format_date

import data.calculated
from data.data import Data
from data.nearest_grid_point import find_nearest_grid_point
from data.sqlite_database import SQLiteDatabase
from data.utils import timestamp_to_datetime
from data.variable import Variable
from data.variable_list import VariableList
from utils.errors import ServerError

def find_le(a, x):
    """
    Find right-most value in `a` that is <= x.
    `a` MUST be sorted in ascending order for
    this to perform optimally in O(log(n)).
    If `x` is < all values in `a`, `a[0]` is returned.
    """
    i = bisect_right(a, x)
    if i:
        return a[i-1]
    return a[0]


def find_ge(a, x):
    """
    Find left-most value in `a` that is <= x.
    `a` MUST be sorted in ascending order for
    this to perform optimally in O(log(n)).
    If `x` is > all values in `a`, `a[-1]` is returned.
    """
    i = bisect_left(a, x)
    if i != len(a):
        return a[i]
    return a[-1]


def get_data_vars_from_equation(equation: str, data_variables: List[str]) -> List[str]:
    regex = re.compile(r'[a-zA-Z][a-zA-Z_0-9]*')

    variables = set(re.findall(regex, equation))
    data_vars = set(data_variables)

    return list(variables & data_vars)

def string_to_datetime(string: str) -> datetime.datetime:
    return dateutil.parser.parse(string).replace(txinfo=pytz.UTC)

def datetime_to_timestamp(datetime: datetime.datetime, time_units: str):

    t = cftime.utime(time_units)

    datetime = datetime.replace(tzinfo=pytz.UTC)
    return t.date2num(datetime)


def timestamp_to_datetime(timestamps, time_units: str):

    if isinstance(timestamps, np.ndarray):
        timestamps = timestamps.tolist()

    if not isinstance(timestamps, list):
        timestamps = [timestamps]

    t = cftime.utime(time_units)

    result = list(map(
        lambda time: t.num2date(time).replace(tzinfo=pytz.UTC),
        timestamps
    ))

    if isinstance(result[0], list):
        return list(itertools.chain(*result))

    return result


def roll_time(requested_index: int, len_timestamp_dim: int):
    if abs(requested_index) > len_timestamp_dim:
        return -1

    return requested_index


class DateTimeEncoder(json.JSONEncoder):

    def default(self, o):
        if isinstance(o, datetime.datetime):
            return o.isoformat()

        return json.JSONEncoder.default(self, o)