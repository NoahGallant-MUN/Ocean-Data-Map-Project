from netCDF4 import Dataset
import matplotlib.pyplot as plt
import matplotlib.cm
import matplotlib.colors
from matplotlib.colorbar import ColorbarBase
from matplotlib.ticker import ScalarFormatter
import numpy as np
import re
import plotting.colormap as colormap
import plotting.utils as utils
from io import BytesIO
import os
import math
from oceannavigator.dataset_config import get_dataset_url, get_variable_name, \
    get_variable_unit, get_dataset_climatology, get_variable_scale_factor
from pyproj import Proj
import pyproj
from scipy.ndimage.filters import gaussian_filter
from PIL import Image
from flask_babel import gettext
from skimage import measure
import contextlib
from data import open_dataset
from flask import current_app

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) +
                                (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return (xtile, ytile)


def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)


def get_m_coords(projection, x, y, z):
    if projection == 'EPSG:3857':
        nw = num2deg(x, y, z)
        se = num2deg(x + 1, y + 1, z)

        wgs84 = Proj(init='EPSG:4326')
        dest = Proj(init=projection)

        # 0,0 is top-left, 1st dim is rows
        x1, y1 = pyproj.transform(wgs84, dest, nw[1], nw[0])
        x2, y2 = pyproj.transform(wgs84, dest, se[1], se[0])
    elif projection == 'EPSG:32661' or projection == 'EPSG:3031':
        if projection == 'EPSG:32661':
            boundinglat = 60.0
            lon_0 = 0
            llcrnr_lon = -45
            urcrnr_lon = 135
        elif projection == 'EPSG:3031':
            boundinglat = -60.0
            lon_0 = 0
            llcrnr_lon = -135
            urcrnr_lon = 45

        proj = Proj(init=projection)

        xx, yy = proj(lon_0, boundinglat)
        lon, llcrnr_lat = proj(math.sqrt(2.) * yy, 0., inverse=True)
        urcrnr_lat = llcrnr_lat

        urcrnrx, urcrnry = proj(urcrnr_lon, urcrnr_lat)
        llcrnrx, llcrnry = proj(llcrnr_lon, llcrnr_lat)

        n = 2 ** z
        x_tile = (urcrnrx - llcrnrx) / n
        y_tile = (urcrnry - llcrnry) / n

        dx = x_tile / 256
        dy = y_tile / 256

        x = llcrnrx + x * x_tile + \
            dx * np.indices((256, 256), np.float32)[0, :, :]
        y = llcrnry + (n - y - 1) * y_tile + \
            dy * np.indices((256, 256), np.float32)[1, :, :]
        x = x[:, ::-1]
        y = y[:, ::-1]

        return x, y

    x0 = np.linspace(x1, x2, 256)
    y0 = np.linspace(y1, y2, 256)

    return x0, y0


def get_latlon_coords(projection, x, y, z):
    x0, y0 = get_m_coords(projection, x, y, z)
    # webmerc = Proj(init='EPSG:3857')
    dest = Proj(init=projection)
    lon, lat = dest(x0, y0, inverse=True)

    return lat, lon

"""
    Draws the variable scale that is placed over the map.
    Returns a BytesIO object.
"""
def scale(args):
    dataset_name = args.get('dataset')
    scale = args.get('scale')
    scale = [float(component) for component in scale.split(',')]

    variable = args.get('variable')
    anom = False
    if variable.endswith('_anom'):
        variable = variable[0:-5]
        anom = True

    variable = variable.split(',')

    with open_dataset(get_dataset_url(dataset_name)) as dataset:
        variable_unit = get_variable_unit(dataset_name,
                                          dataset.variables[variable[0]])
        variable_name = get_variable_name(dataset_name,
                                          dataset.variables[variable[0]])

    if variable_unit.startswith("Kelvin"):
        variable_unit = "Celsius"

    if anom:
        cmap = colormap.colormaps['anomaly']
        variable_name = gettext("%s Anomaly") % variable_name
    else:
        cmap = colormap.find_colormap(variable_name)

    if len(variable) == 2:
        if not anom:
            cmap = colormap.colormaps.get('speed')

        variable_name = re.sub(
            r"(?i)( x | y |zonal |meridional |northward |eastward )", " ",
            variable_name)
        variable_name = re.sub(r" +", " ", variable_name)

    fig = plt.figure(figsize=(2, 5), dpi=75)
    ax = fig.add_axes([0.05, 0.05, 0.25, 0.9])
    norm = matplotlib.colors.Normalize(vmin=scale[0], vmax=scale[1])

    formatter = ScalarFormatter()
    formatter.set_powerlimits((-3, 4))
    bar = ColorbarBase(ax, cmap=cmap, norm=norm, orientation='vertical',
                       format=formatter)
    bar.set_label("%s (%s)" % (variable_name.title(),
                               utils.mathtext(variable_unit)), fontsize=12)
    # Increase tick font size
    bar.ax.tick_params(labelsize=12)

    buf = BytesIO()
    plt.savefig(buf, format='png', dpi='figure', transparent=False,
                bbox_inches='tight', pad_inches=0.05)
    plt.close(fig)

    buf.seek(0) # Move buffer back to beginning
    return buf


def plot(projection, x, y, z, args):
    
    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    dataset_name = args.get('dataset')
    variable = args.get('variable')
    if variable.endswith('_anom'):
        variable = variable[0:-5]
        anom = True
    else:
        anom = False

    variable = variable.split(',')

    depth = args.get('depth')

    scale = args.get('scale')
    scale = [float(component) for component in scale.split(',')]

    data = []
    with open_dataset(get_dataset_url(dataset_name)) as dataset:
        if args.get('time') is None or (type(args.get('time')) == str and
                                        len(args.get('time')) == 0):
            time = -1
        else:
            time = int(args.get('time'))

        t_len = len(dataset.timestamps)
        while time >= t_len:
            time -= t_len

        while time < 0:
            time += len(dataset.timestamps)

        timestamp = dataset.timestamps[time]
        
        for v in variable:
            data.append(dataset.get_area(
                np.array([lat, lon]),
                depth,
                time,
                v,
                args.get('interp'),
                args.get('radius'),
                args.get('neighbours')
            ))

        variable_name = get_variable_name(dataset_name,
                                          dataset.variables[variable[0]])
        variable_unit = get_variable_unit(dataset_name,
                                          dataset.variables[variable[0]])
        scale_factor = get_variable_scale_factor(
            dataset_name,
            dataset.variables[variable[0]]
        )

        if 'display' in args:
            cmap = colormap.colormaps[args.get('display')]
        elif anom:
            cmap = colormap.colormaps['anomaly']
        else:
            cmap = colormap.find_colormap(variable_name)

        if depth != 'bottom':
            depthm = dataset.depths[depth]
        else:
            depthm = 0

    if scale_factor != 1.0:
        for idx, val in enumerate(data):
            data[idx] = np.multiply(val, scale_factor)

    if variable_unit.startswith("Kelvin"):
        variable_unit = "Celsius"
        for idx, val in enumerate(data):
            data[idx] = np.add(val, -273.15)

    if len(data) == 1:
        data = data[0]

    if len(data) == 2:
        data = np.sqrt(data[0] ** 2 + data[1] ** 2)
        if not anom:
            cmap = colormap.colormaps.get('speed')
    
    if anom:
        with open_dataset(get_dataset_climatology(dataset_name)) as dataset:
            a = dataset.get_area(
                np.array([lat, lon]),
                depth,
                timestamp.month - 1,
                v,
                args.get('interp'),
                args.get('radius'),
                args.get('neighbours')
            )
            data -= a
    data = data.transpose()
    xpx = x * 256
    ypx = y * 256

    with Dataset(current_app.config['ETOPO_FILE'] % (projection, z), 'r') as dataset:
        bathymetry = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)]

    bathymetry = gaussian_filter(bathymetry, 0.5)

    if (args.get('masked') == 1):
        pass
    else:
        data[np.where(bathymetry > -depthm)] = np.ma.masked
    
    
    sm = matplotlib.cm.ScalarMappable(
        matplotlib.colors.Normalize(vmin=scale[0], vmax=scale[1]), cmap=cmap)
    
    img = sm.to_rgba(np.ma.masked_invalid(np.squeeze(data)))
    im = Image.fromarray((img * 255.0).astype(np.uint8))
    
    x = np.asarray(im.convert('RGBA')).copy()
    
    mask = (x[:,:,0] <= 3) & (x[:,:,1] <= 5) & (x[:,:,2] <= 18)
    #mask = x[:,:,0] < 50
    
    x[:, :, 3] = (255 * (1 - mask)).astype(np.uint8)#(255 * (x[:, :, :3] != 255).any(axis=2)).astype(np.uint8)
    

    im = Image.fromarray(x.astype(np.uint8))

    buf = BytesIO()
    im.save(buf, format='PNG', optimize=True)
    return buf

def contour(projection, x, y, z, args):
    print("ARGS: ", args)
    lat, lon = get_latlon_coords(projection, x, y, z)

    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    dataset_name = args.get('dataset')
    variable = args.get('variable')

    if variable.endswith('_anom'):
        variable = variable[0:-5]
        anom = True
    else:
        anom = False

    variable = variable.split(',')
    depth = args.get('depth')
    scale = args.get('scale')
    scale = [float(component) for component in scale.split(',')]

    contour_data = []

    with open_dataset(get_dataset_url(dataset_name)) as dataset:

        if args.get('time') is None or (type(args.get('time')) == str and
                                        len(args.get('time')) == 0):
            time = -1
        else:
            time = int(args.get('time'))

        t_len = len(dataset.timestamps)
        while time >= t_len:
            time -= t_len

        while time < 0:
            time += len(dataset.timestamps)

        timestamp = dataset.timestamps[time]

        contour_data = []

        for v in variable:
            contour_data.append(dataset.get_area(
                np.array([lat, lon]),
                depth,
                time,
                v,
                args.get('interp'),
                args.get('radius'),
                args.get('neighbours')
            ))
        variables = dataset.variables
        contour_name = get_variable_name(dataset_name, variables[variables[0]])
        contour_unit = get_variable_unit(dataset_name, variables[variable[0]])
        contour_factor = get_variable_scale_factor( dataset_name, variables[variable[0]])

        if contour_unit.startswith("Kelvin"):
            contour_unit = "Celsius"
            for idx, val in enumerate(contour_data):
                contour_data[idx] = np.add(val, -273.15)

        if contour_factor != 1.0:
            for idx, val in enumerate(contour_data):
                contour_data[idx] = np.multiply(val, contour_factor)

        if len(contour_data) == 1:
            contour_data = contour_data[0]

        if len(contour_data) == 2:
            contour_data = np.sqrt(contour_data[0] ** 2 + contour_data[1] ** 2)
            
        contour_data = contour_data.transpose()
        contour_data = np.flip(contour_data, 0)

        

        #timestamp = dataset.timestamps(args.get('time'))

    difference = (scale[1] - scale[0]) / 5
    levels = [scale[0] + difference, scale[0] + 2*difference, scale[0] + 3*difference, scale[0] + 4* difference, scale[1]]
    print("LEVELS: ", levels)
    xpx = x * 256
    ypx = y * 256

    if depth != 'bottom':
            depthm = dataset.depths[depth]
    else:
        depthm = 0

    with Dataset(current_app.config['ETOPO_FILE'] % (projection, z), 'r') as dataset:
        #bathymetry = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)]
        #bathymetry = gaussian_filter(bathymetry, 0.5)
        bathymetry = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)] * -1
        bathymetry = bathymetry[::-1, :]
        if (args.get('masked') == 1):
            pass
        else:
            contour_data[np.where(bathymetry < depthm)] = np.ma.masked
            #contour_data[np.where(bathymetry > 0)] = np.ma.masked

    min_indices = contour_data.min()
    contour_data[np.where(contour_data == np.ma.masked)] = -50

    normalized = matplotlib.colors.Normalize(vmin=scale[0], vmax=scale[1])(levels)
    
    print("CONTOURS: ", args.get('contours'))
    if args.get('contours') == 'default':
        print("Variable: ", variable)
        cmap = colormap.find_colormap(variable[0])
    else:
        cmap = colormap.colormaps[args.get('contours')]
    
    colors = cmap(normalized)
    
    fig = plt.figure()
    fig.set_size_inches(4, 4)
    ax = plt.Axes(fig, [0, 0, 1, 1])
    ax.set_axis_off()
    fig.add_axes(ax)
    
    
    #contour_data[np.where(contour_data <= levels[0])] = 0
    #print(contour_data[np.where(contour_data <= 0)])
    for i, l in enumerate(levels):
        
        contours = measure.find_contours(contour_data, l)
        
        #if l == levels[0]:
        #    contours = []
        #    print("CONTOURS: ", contours)
        
        for n, contour in enumerate(contours):
            ax.plot(contour[:, 1], contour[:, 0], color=colors[i], linewidth=3)
    
     
    plt.xlim([0, 255])
    plt.ylim([0, 255])
    #plt.clabel(colors, inline=1, fontsize=10)

    with contextlib.closing(BytesIO()) as buf:
        plt.savefig(
            buf,
            format='png',
            dpi=64,
            transparent=True,
        )
        plt.close(fig)
        buf.seek(0)
        im = Image.open(buf)

        #x = np.asarray(im.convert('RGBA')).copy()
        #print("X: ", x)
        #print("COLORS[0]: ", colors[levels[0]])
        #x[np.where(x == colors[0])] = np.ma.masked
        #print("X AGAIN: ", x)
        #im = Image.fromarray(x.astype(np.uint8))
        #print(im)
        buf2 = BytesIO()
        im.save(buf2, format='PNG', optimize=True)
        return buf2

    return None




def topo(projection, x, y, z, shaded_relief):
    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    xpx = x * 256
    ypx = y * 256

    scale = [-4000, 1000]
    cmap = 'BrBG_r'

    land_colors = plt.cm.BrBG_r(np.linspace(0.6, 1, 128))
    water_colors = colormap.colormaps['bathymetry'](np.linspace(1, 0.25, 128))
    colors = np.vstack((water_colors, land_colors))
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list('topo', colors)

    data = None
    with Dataset(current_app.config['ETOPO_FILE'] % (projection, z), 'r') as dataset:
        data = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)]

    shade = 0
    if shaded_relief:
        x, y = np.gradient(data)
        slope = np.pi / 2. - np.arctan(np.sqrt(x * x + y * y))
        aspect = np.arctan2(-x, y)
        altitude = np.pi / 4.
        azimuth = np.pi / 2.

        shaded = np.sin(altitude) * np.sin(slope)\
            + np.cos(altitude) * np.cos(slope)\
            * np.cos((azimuth - np.pi / 2.) - aspect)
        shade = (shaded + 1) / 8
        shade = np.repeat(np.expand_dims(shade, 2), 4, axis=2)
        shade[:, :, 3] = 0


    sm = matplotlib.cm.ScalarMappable(
        matplotlib.colors.SymLogNorm(linthresh=0.1,
                                     vmin=scale[0],
                                     vmax=scale[1]),
        cmap=cmap)
    img = sm.to_rgba(np.squeeze(data))

    img = img + shade
    img = np.clip(img, 0, 1)

    im = Image.fromarray((img * 255.0).astype(np.uint8))
    buf = BytesIO()
    im.save(buf, format='PNG', optimize=True)
    
    return buf


def bathymetry(projection, x, y, z, args):
    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    xpx = x * 256
    ypx = y * 256

    with Dataset(current_app.config['ETOPO_FILE'] % (projection, z), 'r') as dataset:
        data = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)] * -1
        data = data[::-1, :]

    LEVELS = [100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000]

    normalized = matplotlib.colors.LogNorm(vmin=1, vmax=6000)(LEVELS)
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list(
        'transparent_gray',
        [(0, 0, 0, 1), (0, 0, 0, 0.5)]
    )
    colors = cmap(normalized)

    fig = plt.figure()
    fig.set_size_inches(4, 4)
    ax = plt.Axes(fig, [0, 0, 1, 1])
    ax.set_axis_off()
    fig.add_axes(ax)

    for i, l in enumerate(LEVELS):
        contours = measure.find_contours(data, l)

        for n, contour in enumerate(contours):
            ax.plot(contour[:, 1], contour[:, 0], color=colors[i], linewidth=1)

    plt.xlim([0, 255])
    plt.ylim([0, 255])

    with contextlib.closing(BytesIO()) as buf:
        plt.savefig(
            buf,
            format='png',
            dpi=64,
            transparent=True,
        )
        plt.close(fig)
        buf.seek(0)
        im = Image.open(buf)

        buf2 = BytesIO()
        im.save(buf2, format='PNG', optimize=True)
        return buf2

    return None
