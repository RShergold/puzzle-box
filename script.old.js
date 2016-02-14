var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set( 0, 0, 150 );
camera.lookAt( scene.position );
camera.updateMatrix();

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

// scene
var ambientLight = new THREE.AmbientLight(0xffffff);
scene.add( ambientLight );

// var directionalLight = new THREE.DirectionalLight(0xffffff);
// directionalLight.position.set(0, 0, 1);
// scene.add(directionalLight);

// var pointLight = new THREE.PointLight( 0xffffff, 0.1 );
// camera.add( pointLight );

scene.add( camera );




function loadObjects(objects, onFinished) {

  const mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath('./assets/');

  Object.keys(objects).map( objectName => {
    mtlLoader.load(`${objectName}.mtl`, materials => {
      materials.preload();

      const objLoader = new THREE.OBJLoader();
      objLoader.setPath('./assets/');
      objLoader.setMaterials(materials);
      objLoader.load(`${objectName}.obj`, obj => {
        scene.add(obj);
        objects[objectName].object = obj;
        if( !Object.values(objects).find(object => object.object === null) ) {
          onFinished();
        }

      });
    });
  });


}


var objects = {
  // frame: {
  //   object: null
  // },
  // top: {
  //   object: null
  // },
  front: {
    object: null,
    child: 'front-inner',
    next: 'top'
  },
  'front-inner': {
    object: null,
    axis: 'x',
    canMoveTo: x =>
      x >= 0 && x <= 10 && objects.front.object.position.y == 0
  },
  // back: {
  //   object: null
  // },
  // 'back-inner': {
  //   object: null
  // }
}

var nextObjectName = 'front-inner';

loadObjects(objects, ()=>{
  console.log('loaded all');

  // objects['front-inner'].translateX(10);
})









var plane = new THREE.Plane();
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var offset = new THREE.Vector3();
var intersection = new THREE.Vector3();

var selected = null;
var hovered = null;

function onMouseMove( event ) {
  event.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
  mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(scene.children, true);

  if( selected ) {
    if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
      var newPosition = intersection.sub(offset);

      const { axis, canMoveTo } = objects[nextObjectName];
      if( canMoveTo(newPosition[axis] * .5 ) ) {
        selected.position.setX(newPosition.x * .5);

        console.log(newPosition.x * .5)
      }
      // selected.translateX(newPosition.x);
      // console.log(intersection.sub(selected.position));
      // selected.position.copy( intersection.sub( offset ) );

    }
  }

  if( intersects.length > 0 ) {
    var object = intersects[0].object;

    if( objects[nextObjectName].object.children.includes(object) ) {

      plane.setFromNormalAndCoplanarPoint( camera.getWorldDirection( plane.normal ), object.position );
      hovered = object;
    } else {
      hovered = null;
    };
  } else {
    hovered = null;
  }

  renderer.domElement.style.cursor = !!hovered ? 'pointer' : 'auto';

}

function onMouseDown( event ) {
  event.preventDefault();

  if( hovered ) {
    selected = hovered;
    controls.enabled = false;

    if( raycaster.ray.intersectPlane(plane, intersection) ) {
      console.log('here???');
      offset.copy(intersection).sub(selected.position)
    } else {
      console.log('not here')
    }
  } else {
    controls.enabled = true;
  }
}

function onMouseUp( event ) {
  selected = null;
}


renderer.domElement.addEventListener('mousemove', onMouseMove, false);
renderer.domElement.addEventListener('mousedown', onMouseDown, false);
renderer.domElement.addEventListener('mouseup', onMouseUp, false);

window.addEventListener( 'xxx-mousedown', event => {
  event.preventDefault();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  console.log(mouse.x, mouse.y);

  raycaster.setFromCamera( mouse, camera );
  var intersects = raycaster.intersectObjects( scene.children, true );

  if( intersects.length > 0 ) {
    var touchedObject = intersects[0].object;
    var touchingActiveObj = objects[nextObjectName].children.includes(touchedObject);
    console.log('touched?', touchingActiveObj);
  }

  controls.enabled = !touchingActiveObj;
});



function animate() {
  requestAnimationFrame( animate );

  // controls.update();
  renderer.render( scene, camera );
}
animate();
