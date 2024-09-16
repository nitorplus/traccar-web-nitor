import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  Divider, Typography, IconButton, useMediaQuery, Toolbar,
  List,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  ListItem,
  InputAdornment,
  OutlinedInput,
  FormControl,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { useTheme } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate, useParams } from 'react-router-dom';
import MapView from '../map/core/MapView';
import MapCurrentLocation from '../map/MapCurrentLocation';
import MapGeocoder from '../map/geocoder/MapGeocoder';
import { useSelector } from 'react-redux';
import { useCatch, useEffectAsync } from '../reactHelper';
import MapRoutePath from '../map/MapRoutePath';
import MapMarkers from '../map/MapMarkers';
import MapJobs from '../map/MapJobs';
import MapRouteCoordinates from '../map/MapRouteCoordinates';
import MapGeofence from '../map/MapGeofence';
import { formatNumericHours, formatTime } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column-reverse',
    },
  },
  drawer: {
    zIndex: 1,
  },
  drawerPaper: {
    position: 'relative',
    [theme.breakpoints.up('sm')]: {
      width: '640px',
    },
    [theme.breakpoints.down('sm')]: {
      height: theme.dimensions.drawerHeightPhone,
    },
  },
  mapContainer: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  fileInput: {
    display: 'none',
  },
}));

const key = 'hxukgv664my87r47ukxcw4c6kwzfrxpxu8zhpf58m6mv5xjk5r6mmuh8ncugkpvs';

const JobsPage = () => {
  const theme = useTheme();
  const classes = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const { id } = useParams();
  const [deviceId, setDeviceId] = useState(id);

  const devices = useSelector((state) => state.devices.items);
  const device = devices[deviceId];

  const [day, setDay] = useState(null);
  const [manifestNumber, setManifestNumber] = useState('');
  const [manifest, setManifest] = useState();
  const [jobs, setJobs] = useState([]);
  const [stopMarkers, setStopMarkers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [positionMarkers, setPositionMarkers] = useState([]);

  const jobsWithLocation = jobs?.filter((j) => j.latitudeValues && j.longitudeValues);

  useEffectAsync(async () => {
    const response = await fetch(`https://portal.data-trak.co.uk/api/traccar/v1/manifest?vehicle=${device.name}&key=${key}`);
    if (response.ok) {
      const manifest = await response.json();
      setManifest(manifest);
      setDay(dayjs(manifest.MDate));
    } else {
      throw Error(await response.text());
    }
  }, []);

  useEffectAsync(async () => {
    const response = await fetch(`https://portal.data-trak.co.uk/api/traccar/v1/manifest_jobs?vehicle=${device.name}&key=${key}`);
    if (response.ok) {
      setJobs(await response.json());
    } else {
      throw Error(await response.text());
    }
  }, []);

  const loadManifest = useCatch(async () => {
    const response1 = await fetch(`https://portal.data-trak.co.uk/api/traccar/v1/manifest_byload?&manifest=${manifestNumber}&key=${key}`);
    if (response1.ok) {
      const manifest = await response1.json();
      setManifest(manifest);
      setDay(dayjs(manifest.MDate));
      const newDevice = Object.values(devices).find((d) => d.name === manifest.registration);
      if (newDevice) {
        setDeviceId(newDevice.id);
      }
    } else {
      throw Error(await response1.text());
    }

    const response2 = await fetch(`https://portal.data-trak.co.uk/api/traccar/v1/manifest_jobs_byload?&manifest=${manifestNumber}&key=${key}`);
    if (response2.ok) {
      setJobs(await response2.json());
    } else {
      throw Error(await response2.text());
    }
  });

  useEffectAsync(async () => {
    if (!day) {
      return;
    }
    const query = new URLSearchParams({
      deviceId,
      from: day.startOf('day').toISOString(),
      to: day.endOf('day').toISOString(),
    });
    const response = await fetch(`/api/reports/stops?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const stops = await response.json();
      setStopMarkers(
        stops.map((stop) => ({
          latitude: stop.latitude,
          longitude: stop.longitude,
          image: 'person-info',
          popup: `<div style="color: black;">Time: ${formatTime(stop.startTime, 'minutes')}<br>Duration: ${formatNumericHours(stop.duration, t)}</div>`,
        })),
      );
    } else {
      throw Error(await response.text());
    }
  }, [deviceId, day, setStopMarkers]);

  useEffectAsync(async () => {
    if (!day) {
      return;
    }
    const query = new URLSearchParams({
      deviceId,
      from: day.startOf('day').toISOString(),
      to: day.endOf('day').toISOString(),
    });
    const response = await fetch(`/api/positions?${query.toString()}`);
    if (response.ok) {
      const positions = await response.json();
      setPositions(positions);
      if (positions.length) {
        setPositionMarkers([
          {
            latitude: positions[0].latitude,
            longitude: positions[0].longitude,
            image: 'default-success',
          },
          {
            latitude: positions[positions.length - 1].latitude,
            longitude: positions[positions.length - 1].longitude,
            image: 'default-error',
          },
        ]);
      }
    } else {
      throw Error(await response.text());
    }
  }, [deviceId, day, setPositions, setPositionMarkers]);

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        <Drawer
          className={classes.drawer}
          anchor={isPhone ? 'bottom' : 'left'}
          variant="permanent"
          classes={{ paper: classes.drawerPaper }}
        >
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>Manifest {manifest?.ManifestNo}</Typography>
            <FormControl variant="outlined">
              <OutlinedInput
                value={manifestNumber}
                onChange={(e) => setManifestNumber(e.target.value)}
                endAdornment={(
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" onClick={() => loadManifest()} disabled={!Boolean(manifestNumber)}>
                      <SearchIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )}
              />
            </FormControl>
          </Toolbar>
          {manifest && (
            <List>
              <ListItem><span><b>Road Show Load: </b>{manifest.RoadShowLoad}</span></ListItem>
              <ListItem><span><b>Manifest Type: </b>{manifest.ManifestType}</span></ListItem>
              <ListItem><span><b>Date: </b>{manifest.MDate}</span></ListItem>
              <ListItem><span><b>Start Time: </b>{manifest.StartTime}</span></ListItem>
              <ListItem><span><b>Trailer Name: </b>{manifest.TrlName}</span></ListItem>
              <ListItem><span><b>Driver: </b>{manifest.DriverShortName}</span></ListItem>
              <ListItem><span><b>Vehicle Registration: </b>{manifest.registration}</span></ListItem>
            </List>
          )}
          <Divider />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Order</TableCell>
                <TableCell>Collect From</TableCell>
                <TableCell>Deliver To</TableCell>
                <TableCell>Postcode</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs?.map((job) => (
                <TableRow key={job.RowID}>
                  <TableCell>{job.JobOrder}</TableCell>
                  <TableCell>{job.Collect1}</TableCell>
                  <TableCell>{job.Deliver1}</TableCell>
                  <TableCell>{job.latitudeValues && job.longitudeValues ? job.DPostCode : 'No location'}</TableCell>
                  <TableCell>{job.PODRecieved < 0 ? 'Delivered' : 'Un-delivered'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Drawer>
        <div className={classes.mapContainer}>
          <MapView>
            <MapGeofence />
            <MapRoutePath positions={positions} />
            <MapMarkers markers={stopMarkers} />
            <MapMarkers markers={positionMarkers} />
            <MapJobs jobs={jobsWithLocation} />
            <MapRouteCoordinates
              name={device?.name}
              coordinates={jobsWithLocation?.map((job) => ([Number(job.latitudeValues), Number(job.longitudeValues)]))}
              deviceId={deviceId}
            />
          </MapView>
          <MapCurrentLocation />
          <MapGeocoder />
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
