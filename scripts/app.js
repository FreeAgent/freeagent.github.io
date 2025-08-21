// Service worker
let loc =  document.location.hostname.toString();
if ('serviceWorker' in navigator && !loc.includes('localhost') && !loc.includes('192.')) {
  const x = navigator.serviceWorker.register('./sw.js').then((registration) => {
    console.log('Service worker registration succeeded:', registration);
  }, /*catch*/ (error) => {
    console.error(`Service worker registration failed: ${error}`);
  });
}



// util
function flash(key) {
  let $s = document.querySelector('[data-jam]');
  if (!$s) {
    let s = document.createElement('span');
    s.setAttribute('data-jam', true);
    s.style = `
      position: absolute;
      top: 25%;
      left: 50%;
      background: rgba(0,0,0,0.75);
      border-radius: 4px;
      padding: 1em;
      font-size: 1rem;
      color: #fff;
      transform: translateX(-50%);
      transition: opacity .3s ease-out;
      font-family: sans-serif;
    `;
    $s = document.body.appendChild(s);

    setTimeout(()=>{
      $s.style.opacity = 0;
    }, 1000);

    setTimeout(()=>{
      $s.remove();
    }, 1500);
  }
  $s.innerText = key;
}



// Map
var map = L.map('map', {
  attributionControl: true,
  zoomControl: false,
  minZoom: 9,
  maxZoom: 16,
  zoomSnap: 0.1,
});
map.getRenderer(map).options.padding = 100;
map.on('zoomend', () => {
  // flash(`Zoom ${Math.round(map.getZoom())}`);
  console.log(`Zoom ${Math.round(map.getZoom())}`);
  if (map.getZoom() > 12) {
    document.body.classList.remove('is-zoom-mid');
    document.body.classList.add('is-zoom-strong');
  } else if (map.getZoom() > 10.5) {
    document.body.classList.add('is-zoom-mid');
    document.body.classList.remove('is-zoom-strong');
  } else {
    document.body.classList.remove('is-zoom-strong');
    document.body.classList.remove('is-zoom-mid');
  }
});

// Write geo coordinates to clipboard on tap
map.on('click', function(e){
  // var marker = new L.marker(e.latlng).addTo(map);
  let lat = e.latlng.lat.toFixed(7);
  let lng = e.latlng.lng.toFixed(7);
  let latlng = `${lat}, ${lng}`;
  navigator.clipboard.writeText(latlng);
});

// Add locate control
L.control.locate().addTo(map);

// Tiles
let urlTemplate = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}.jpg';
let baseLayer = L.tileLayer
  .offline(urlTemplate, {
    attribution: 'Relief maps from <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ESRI/ArcGIS</a>'
    // minZoom: 11,
  })
  .addTo(map);


// Elevation control
var elevation_options = {

  // Default chart colors: theme lime-theme, magenta-theme, ...
  theme: "lightblue-theme",

  // Chart container outside/inside map container
  detached: true,
  height: window.innerHeight * .3,

  // if (detached), the elevation chart container
  elevationDiv: ".elevation-wrapper > div",

  // if (!detached) autohide chart profile on chart mouseleave
  autohide: false,

  // if (!detached) initial state of chart profile control
  collapsed: true,
  
  // if (!detached) control position on one of map corners
  position: "topright",
  
  // Toggle close icon visibility
  closeBtn: false,

  // Autoupdate map center on chart mouseover.
  followMarker: true,

  // Autoupdate map bounds on chart update.
  autofitBounds: true,

  // Chart distance/elevation units.
  imperial: false,

  // [Lat, Long] vs [Long, Lat] points. (leaflet default: [Lat, Long])
  reverseCoords: false,

  // Acceleration chart profile: true || "summary" || "disabled" || false
  acceleration: false,

  // Slope chart profile: true || "summary" || "disabled" || false
  slope: false,

  // Speed chart profile: true || "summary" || "disabled" || false
  speed: false,

  // Altitude chart profile: true || "summary" || "disabled" || false
  altitude: true,

  // Display time info: true || "summary" || false
  time: false,

  // Display distance info: true || "summary" || false
  distance: true,

  // Summary track info style: "inline" || "multiline" || false
  summary: false,

  // Download link: "link" || false || "modal"
  downloadLink: false,

  // Toggle chart ruler filter
  ruler: true,

  // Toggle chart legend filter
  legend: false,

  // Toggle "leaflet-almostover" integration
  almostOver: true,

  // Toggle "leaflet-distance-markers" integration
  distanceMarkers: false,
  
  // Toggle "leaflet-hotline" integration
  hotline: true,

  // Display track datetimes: true || false
  timestamps: false,

  // Display track waypoints: true || "markers" || "dots" || false
  waypoints: "dots",

  // Toggle custom waypoint icons: true || { associative array of <sym> tags } || false
  wptIcons: {
    '': L.divIcon({
      className: 'elevation-waypoint-marker',
      html: '<i class="elevation-waypoint-icon"></i>',
      iconSize: [30, 30],
      iconAnchor: [8, 30],
    }),
  },

  // Toggle waypoint labels: true || "markers" || "dots" || false
  wptLabels: true,

  // Render chart profiles as Canvas or SVG Paths
  preferCanvas: true,
};

// Instantiate elevation control.
var controlElevation = L.control.elevation(elevation_options).addTo(map);
// Overwrite fn to prevent map from being reset in PWAs (for some reason resize event fires on app blur)
controlElevation._resetView = () => null;

// Load track from url (allowed data types: "*.geojson", "*.gpx", "*.tcx")
controlElevation.load("data/sentiero-alpino-calanca.gpx");

// Double tapping elevation map toggles zoom level
let zoomLevels = [100, 200, 400, 800];
let curZoom = 100;

let $elDiv = document.querySelector('.elevation-wrapper > div');
let $elWrapper = document.querySelector('.elevation-wrapper');
function handleZoomToggle() {
  let i = zoomLevels.indexOf(curZoom);
  curZoom = zoomLevels[(i+1)%zoomLevels.length]
  $elDiv.style.width = `${curZoom}vw`
  // e.target.innerText = `Toggle Elevation (${curZoom}%)`
  controlElevation.redraw();
  if(curZoom !== 100) {
    $elWrapper.classList.add('is-scrollable');
  } else {
    $elWrapper.classList.remove('is-scrollable');
  }
}

let lastTap;
$elWrapper.addEventListener('click', () => {
  let now = new Date().getTime();
  let timesince = now - lastTap;
  if ((timesince < 400) && (timesince > 0)){
     // double tap  
    handleZoomToggle();
  }
  lastTap = new Date().getTime();
});


// GPX
let wptIcons = {};
for(let i=0; i <= 50; i++) {
  wptIcons[`Mile Marker ${i}`] = L.divIcon({
    html: `${i}`,
    className: 'mile-marker',
    iconSize: [12.6, 19],
    iconAnchor: [6.3, 19],
    popupAnchor: null,
  });
}
const gpxFile = 'data/waypoint-sentiero-calanca.gpx';
const gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const g = new L.GPX(gpxFile, {
    async: true,
    marker_options: {
      startIconUrl: gif,
      endIconUrl: gif,
      shadowUrl: null,
      wptIconUrls: {
        'Parking Area': 'img/markers/parking.png',
        'Campground': 'img/markers/campground.png',
        'Water Source': 'img/markers/water.png',
        'Feature': 'img/markers/feature.png',
      },
      wptIcons: wptIcons,
      iconSize: [16, 16],
      shadowSize: [0, 0],
      iconAnchor: [8, 16],
      popupAnchor: [0, -16],
    },
  })
  .on('loaded', () => {})
  .on('addpoint', function(e) {
    // console.log('addpoint', e);
  })
  .on('addline', function(e) {
    // console.log('addline', e);
    // setTimeout(()=>map.fitBounds(e.line.getBounds()), 1000);
  })
  .addTo(map);



// Pace Modal
$modalCloseBtn = document.querySelector('[data-modal-close-btn]');
$modalCloseBtn.addEventListener('click', (e) => {
  toggleModal()
})

function handleTimerBtnClick(evt) {
  L.DomEvent.stopPropagation(evt);
  toggleModal();
}

function toggleModal() {
  if(document.body.classList.contains('modal-is-open')) {
    document.body.classList.remove('modal-is-open')
  } else {
    document.body.classList.add('modal-is-open')
  }
}

L.Control.Pace = L.Control.extend({
    onAdd: function(map) {

      var $div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      this.$div = $div;
      $div.innerHTML = `
        <a class="leaflet-bar-part leaflet-bar-part-single" title="" href="#" role="button">
          <span style="font-size: 1.25rem;">
            ⏱
          </span>
        </a>
      `
      L.DomEvent.on($div, 'click', handleTimerBtnClick);
      return $div;
    },

    onRemove: function(map) {
        L.DomEvent.off(this.$div, 'click', handleTimerBtnClick);
    }
});
L.control.pace = function(opts) {
    return new L.Control.Pace(opts);
}
L.control.pace({ position: 'topleft' }).addTo(map);



// Offline control for tiles
const savetilesControl = L.control.savetiles(baseLayer, {
  // zoomlevels: [11, 12, 13, 14, 15, 16], // optional zoomlevels to save, default current zoomlevel
  zoomlevels: [10, 11, 13, 14, 15],
  confirm(layer, successCallback) {
    // eslint-disable-next-line no-alert
    if (window.confirm(`Save ${layer._tilesforSave.length} tiles?`)) {
      successCallback();
    }
  },
  confirmRemoval(layer, successCallback) {
    // eslint-disable-next-line no-alert
    if (window.confirm('Remove all the tiles?')) {
      successCallback();
    }
  },
  saveText: '<span style="font-size: 1rem">💾</span>',
  rmText: '<span style="font-size: 1rem">🗑</span>',
});
savetilesControl.addTo(map);

// events while saving a tile layer
let progress, total;
const showProgress = () => {
  let progressPct = Math.round(progress/total*100);
  if(progress === total) {
    flash("Tiles have been saved")
  } else if(progressPct % 5 === 0) {
    // show progress every 5%
    flash(`Saving tiles ${progressPct}%`)
  }
};

baseLayer.on('savestart', (e) => {
  progress = 0;
  total = e._tilesforSave.length;
  flash(`Saving tiles 0%`)
});

baseLayer.on('savetileend', () => {
  progress += 1;     
  showProgress();
});
