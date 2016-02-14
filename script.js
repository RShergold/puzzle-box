
// Scene
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer({ alpha: true });
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var controls = new THREE.OrbitControls(camera, renderer.domElement);
var ambientLight = new THREE.AmbientLight(0xffffff);

stats = new Stats();
document.body.appendChild( stats.dom );

// Mouse
var plane = new THREE.Plane();
var mouse = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var offset = new THREE.Vector3();
var intersection = new THREE.Vector3();

// Puzzle
var parts = {
  frame: {
    object: null
  },
  top: {
    object: null,
    axis: 'z',
    canMove: () =>
      parts.front.object.position.y == -5,
    move: z => {
      if( parts.back.object.position.y == -10 ) {
        return snap(z, -200, 5);
      }
      return snap(z, 0, 5)
    }
  },
  front: {
    object: null,
    child: 'frontInner',
    axis: 'y',
    canMove: () =>
      parts.frontInner.object.position.x == 6
      && parts.top.object.position.z == 0,
    move: y => snap(y, -5, 0)
  },
  frontInner: {
    object: null,
    axis: 'x',
    canMove: () =>
      parts.front.object.position.y == 0,
    move: x => snap(x, 0, 6)
  },
  back: {
    object: null,
    child: 'backInner',
    axis: 'y',
    canMove: () => {
      console.log(parts.top.object.position.z, parts.backInner.object.position.x);
      return parts.top.object.position.z == 5
      && (parts.backInner.object.position.x == 0 ||
        parts.backInner.object.position.x == -6);
    },
    move: y => {
      if( parts.backInner.object.position.x == 0 ) {
        return snap(y, -3, 0);
      }
      return snap(y, -10, -3);
    }
  },
  backInner: {
    object: null,
    axis: 'x',
    canMove: () =>
      parts.back.object.position.y == -3,
    move: x => {
      return snap(x, -6, 0)
    }
  }
}
var selectedPart = null;

var directionalLight = new THREE.DirectionalLight(0xffffff);
// var pointLight = new THREE.PointLight( 0xffffff, 0.5 );


function createScene() {
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize( window.innerWidth, window.innerHeight );
  modelContainer.appendChild( renderer.domElement );

  var cameraZ = Math.max(500, renderer.domElement.width) / 140;
  console.log('cameraZ', cameraZ, renderer.domElement.width);
  camera.position.set( -100, 80, 100);
  console.log(scene.position)
  camera.lookAt( scene.position );
  camera.updateMatrix();

// directionalLight.position.set(0, 0, 1);
// scene.add(directionalLight);

// camera.add( pointLight );

  // controls.enableDamping = true;
  // controls.dampingFactor = 0.25;
  // controls.enableZoom = true;
  controls.minDistance = 95;
  controls.maxDistance = 300;

  scene.add( ambientLight );
  scene.add( camera );
}

function animate() {
  requestAnimationFrame( animate );

  stats.begin();
  controls.update();
  renderer.render( scene, camera );
  stats.end();
}

function loadObjects(onFinished) {

  const mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath('./assets/');

  Object.keys(parts).map( objectName => {
    mtlLoader.load(`${objectName}.mtl`, materials => {
      materials.preload();

      // if( objectName == 'frame' ) {
      //   Object
      //     .values(materials.materials)
      //     .forEach( material => {
      //       material.transparent = true;
      //       material.opacity = .25;
      //     });
      // }

      const objLoader = new THREE.OBJLoader();
      objLoader.setPath('./assets/');
      objLoader.setMaterials(materials);
      objLoader.load(`${objectName}.obj`, obj => {
        scene.add(obj);
        parts[objectName].object = obj;
        if( !Object.values(parts).find(object => object.object === null) ) {
          onFinished();
        }

      });
    });
  });
}

function setRaycaster(x, y) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ( ( x - rect.left ) / rect.width ) * 2 - 1;
  mouse.y = - ( ( y - rect.top ) / rect.height ) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
}

function mouseOverPart() {
  var intersects = raycaster.intersectObjects(scene.children, true);
  if(intersects.length > 0) {
    var object = intersects[0].object;
    var partNames = Object.keys(parts);
    for( var partName of partNames ) {
      if( parts[partName].object.children.includes(object) ) {
        return parts[partName];
      }
    }
  }
  return null;
}

function snap(val, min, max) {
  if( val < min + 1 ) {
    return min;
  }
  if( val > max - 1 ) {
    return max;
  }
  return val;
}

// Event handlers
function onMouseDown(event) {
  setRaycaster(event.clientX, event.clientY);

  var part = mouseOverPart();
  if( part && part.canMove && part.canMove() ) {
    selectedPart = part;
    controls.enabled = false;
    if(raycaster.ray.intersectPlane(plane,intersection)) {
      offset.copy(intersection).sub(selectedPart.object.position);
    }
  } else {
    selectedPart = null;
  }
}

function onTouchStart(event) {
  event.preventDefault();
  event = event.changedTouches[0];
  onMouseDown(event);
}

function onMouseMove(event) {
  setRaycaster(event.clientX, event.clientY);

  if(selectedPart) {
    plane.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.normal ), selectedPart.object.position );
    if( raycaster.ray.intersectPlane(plane,intersection)) {
      var axis = selectedPart.axis;
      var desiredPosition = intersection.sub(offset);
      var newAxisPosition = selectedPart.move(desiredPosition[axis]);
      selectedPart.object.position['set'+(axis.toUpperCase())](newAxisPosition);
      if( selectedPart.child ) {
        parts[selectedPart.child]
          .object
          .position['set'+(axis.toUpperCase())](newAxisPosition);
      }
    }
  }
}

function onTouchMove(event) {
  event.preventDefault();
  event = event.changedTouches[0];
  onMouseMove(event);
}

function onMouseUp(event) {
  selectedPart = null;
  controls.enabled = true;
}

function onTouchEnd(event) {
  onMouseUp();
}


renderer.domElement.addEventListener('mousedown', onMouseDown, false);
renderer.domElement.addEventListener('touchstart', onTouchStart, false);
renderer.domElement.addEventListener('mousemove', onMouseMove, false);
renderer.domElement.addEventListener('touchmove', onTouchMove, false);
renderer.domElement.addEventListener('mouseup', onMouseUp, false);
renderer.domElement.addEventListener('touchend', onTouchEnd, false);

createScene();
animate();
loadObjects(()=>{
  console.log('loaded all');
})


