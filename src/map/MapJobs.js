import { useId, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/styles';
import { map } from './core/MapView';
import { useAttributePreference } from '../common/util/preferences';

const MapJobs = ({ jobs }) => {
  const id = useId();

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.addLayer({
      id: id,
      type: 'symbol',
      source: id,
      layout: {
        'icon-image': 'background',
        'icon-size': iconScale,
        'icon-allow-overlap': true,
        'text-field': '{order}',
        'text-size': 14,
        'text-allow-overlap': true,
      },
    });

    return () => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [id]);

  useEffect(() => {
    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: jobs
        .filter((j, index) => index === jobs.findIndex((jj) => jj.JobOrder === j.JobOrder))
        .map((job) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [Number(job.latitudeValues), Number(job.longitudeValues)],
          },
          properties: {
            order: job.JobOrder,
            status: job.PODRecieved,
          },
        })),
    });
  }, [id, jobs]);

  return null;
};

export default MapJobs;
