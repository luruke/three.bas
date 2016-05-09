window.onload = init;

function init() {
  var root = new THREERoot({
    createCameraControls: true,
    antialias: (window.devicePixelRatio === 1),
    fov: 60
  });

  root.renderer.setClearColor(0x222222);
  root.renderer.setPixelRatio(window.devicePixelRatio || 1);
  root.renderer.shadowMap.enabled = true;
  root.renderer.shadowMap.type = THREE.BasicShadowMap;


  root.scene.add(new THREE.AxisHelper(20));

  root.camera.position.set(0, 40, 40);

  var dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.name = 'Dir. Light';
  dirLight.position.set(0, 20, 0);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0;
  dirLight.shadow.camera.far = 40;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  root.scene.add(dirLight);
  root.scene.add(new THREE.CameraHelper(dirLight.shadow.camera));


  var spotLight = new THREE.SpotLight( 0xffffff );
  spotLight.name = 'Spot Light';
  spotLight.angle = Math.PI / 5;
  spotLight.penumbra = 0.3;
  spotLight.position.set( 10, 10, 5 );
  spotLight.castShadow = true;
  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 30;
  spotLight.shadow.mapSize.width = 2048;
  spotLight.shadow.mapSize.height = 2048;
  root.scene.add( spotLight );
  root.scene.add( new THREE.CameraHelper( spotLight.shadow.camera ) );


  var pointLight = new THREE.PointLight();
  pointLight.castShadow = true;
  pointLight.shadow.camera.near = 1;
  pointLight.shadow.camera.far = 30;
  pointLight.shadow.bias = 0.01;
  root.scene.add( pointLight );
  root.scene.add( new THREE.CameraHelper( pointLight.shadow.camera ) );


  var geometry = new THREE.BoxGeometry(40, 40, 40);
  var material = new THREE.MeshPhongMaterial({
    color: 0xa0adaf,
    shading: THREE.SmoothShading,
    side: THREE.BackSide
  });
  var ground = new THREE.Mesh(geometry, material);
  ground.castShadow = false;
  ground.receiveShadow = true;
  root.scene.add(ground);

  var slide = new ParticleSystem();

  slide.transition();

  root.scene.add(slide);
}

////////////////////
// CLASSES
////////////////////

function ParticleSystem() {
  var prefabGeometry = new THREE.TetrahedronGeometry(0.5);
  var prefabCount = 400;
  var geometry = new THREE.BAS.PrefabBufferGeometry(prefabGeometry, prefabCount);

  var i, j, offset;

  // animation
  var aAnimation = geometry.createAttribute('aAnimation', 3);

  var minDuration = 1.0;
  var maxDuration = 1.0;
  var maxDelay = 0;

  this.totalDuration = maxDuration + maxDelay;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    var delay = 0;
    var duration = THREE.Math.randFloat(minDuration, maxDuration);

    for (j = 0; j < prefabGeometry.vertices.length; j++) {
      aAnimation.array[offset] = delay;
      aAnimation.array[offset + 1] = duration;

      offset += 3;
    }
  }

  // position
  var aPosition = geometry.createAttribute('aPosition', 3);
  var position = new THREE.Vector3();

  for (i = 0, offset = 0; i < prefabCount; i++) {
    position.x = THREE.Math.randFloatSpread(40);
    position.y = THREE.Math.randFloatSpread(40);
    position.z = THREE.Math.randFloatSpread(40);

    for (j = 0; j < prefabGeometry.vertices.length; j++) {
      aPosition.array[offset] = position.x;
      aPosition.array[offset + 1] = position.y;
      aPosition.array[offset + 2] = position.z;

      offset += 3;
    }
  }

  // axis angle
  var aAxisAngle = geometry.createAttribute('aAxisAngle', 4);
  var axis = new THREE.Vector3();
  var angle;

  for (i = 0, offset = 0; i < prefabCount; i++) {
    axis.x = THREE.Math.randFloatSpread(2);
    axis.y = THREE.Math.randFloatSpread(2);
    axis.z = THREE.Math.randFloatSpread(2);
    axis.normalize();
    angle = Math.PI * 2;

    for (j = 0; j < prefabGeometry.vertices.length; j++) {
      aAxisAngle.array[offset] = axis.x;
      aAxisAngle.array[offset + 1] = axis.y;
      aAxisAngle.array[offset + 2] = axis.z;
      aAxisAngle.array[offset + 3] = angle;

      offset += 4;
    }
  }


  var material = new THREE.BAS.PhongAnimationMaterial(
    {
      shading: THREE.FlatShading,
      //side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: {type: 'f', value: 0}
      },
      vertexFunctions: [
        THREE.BAS.ShaderChunk['quaternion_rotation']
      ],
      vertexParameters: [
        'uniform float uTime;',
        'attribute vec2 aAnimation;',
        'attribute vec3 aPosition;',
        'attribute vec4 aAxisAngle;'
      ],
      varyingParameters: [
        'varying float vShininess;',
        //'varying vec3 vEmissive;',
        'varying vec3 vSpecular;',
        'varying float vAlpha;'
      ],
      vertexInit: [
        'float tDelay = aAnimation.x;',
        'float tDuration = aAnimation.y;',
        'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
        //'float tProgress = ease(tTime, 0.0, 1.0, tDuration);',
        'float tProgress = tTime / tDuration;'
      ],
      vertexPosition: [
        'float angle = aAxisAngle.w * tProgress;',
        'vec4 tQuat = quatFromAxisAngle(aAxisAngle.xyz, angle);',
        'transformed = rotateVector(tQuat, transformed);',

        'transformed += aPosition;'
      ],
      vertexColor: [
        'vShininess = abs(aPosition.x) * 20.0;',
        'vSpecular = normalize(abs(aPosition));',
        'vAlpha = 1.0;'
      ],
      fragmentParameters: [],
      fragmentAlpha: [
        'diffuseColor.a *= vAlpha;'
      ],
      fragmentEmissive: [
        //'totalEmissiveLight = vEmissive;' // default emissive = (0, 0, 0)
      ],
      fragmentSpecular: [
        //'material.specularStrength = 0.25;'
        'material.specularShininess = vShininess;',
        'material.specularColor = vSpecular;'
      ]
    }, {
      specular: 0xff00ff,
      shininess: 100
    }
  );

  THREE.Mesh.call(this, geometry, material);

  this.frustumCulled = false;
  this.castShadow = true;
  this.receiveShadow = true;

  this.customDepthMaterial = THREE.BAS.Utils.createDepthAnimationMaterial(material);
  this.customDistanceMaterial = THREE.BAS.Utils.createDistanceAnimationMaterial(material);
}
ParticleSystem.prototype = Object.create(THREE.Mesh.prototype);
ParticleSystem.prototype.constructor = ParticleSystem;
Object.defineProperty(ParticleSystem.prototype, 'time', {
  get: function () {
    return this.material.uniforms['uTime'].value;
  },
  set: function (v) {
    this.material.uniforms['uTime'].value = v;
    this.customDepthMaterial.uniforms['uTime'].value = v;
    this.customDistanceMaterial.uniforms['uTime'].value = v;
  }
});

ParticleSystem.prototype.transition = function () {
  return TweenMax.fromTo(this, 2.0, {time: 0.0}, {time: this.totalDuration, ease: Power0.easeInOut, repeat:-1});
};

function THREERoot(params) {
  params = utils.extend({
    fov: 60,
    zNear: 0.1,
    zFar: 10000,

    createCameraControls: true
  }, params);

  this.updateCallbacks = [];
  this.resizeCallbacks = [];

  this.renderer = new THREE.WebGLRenderer({
    antialias: params.antialias
  });
  this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  document.getElementById('three-container').appendChild(this.renderer.domElement);

  this.camera = new THREE.PerspectiveCamera(
    params.fov,
    window.innerWidth / window.innerHeight,
    params.zNear,
    params.zfar
  );

  this.scene = new THREE.Scene();

  if (params.createCameraControls) {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  this.resize = this.resize.bind(this);
  this.tick = this.tick.bind(this);

  this.resize();
  this.tick();

  window.addEventListener('resize', this.resize, false);
}
THREERoot.prototype = {
  addUpdateCallback: function (callback) {
    this.updateCallbacks.push(callback);
  },
  addResizeCallback: function (callback) {
    this.resizeCallbacks.push(callback);
  },

  tick: function () {
    this.update();
    this.render();

    requestAnimationFrame(this.tick);
  },
  update: function () {
    this.controls && this.controls.update();
    this.updateCallbacks.forEach(function (callback) {
      callback()
    });
  },
  render: function () {
    this.renderer.render(this.scene, this.camera);
  },
  resize: function () {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};

////////////////////
// UTILS
////////////////////

var utils = {
  extend: function (dst, src) {
    for (var key in src) {
      dst[key] = src[key];
    }

    return dst;
  },
  randSign: function () {
    return Math.random() > 0.5 ? 1 : -1;
  },
  ease: function (ease, t, b, c, d) {
    return b + ease.getRatio(t / d) * c;
  },
  fibSpherePoint: (function () {
    var vec = {x: 0, y: 0, z: 0};
    var G = Math.PI * (3 - Math.sqrt(5));

    return function (i, n, radius) {
      var step = 2.0 / n;
      var r, phi;

      vec.y = i * step - 1 + (step * 0.5);
      r = Math.sqrt(1 - vec.y * vec.y);
      phi = i * G;
      vec.x = Math.cos(phi) * r;
      vec.z = Math.sin(phi) * r;

      radius = radius || 1;

      vec.x *= radius;
      vec.y *= radius;
      vec.z *= radius;

      return vec;
    }
  })(),
  spherePoint: (function () {
    return function (u, v) {
      u === undefined && (u = Math.random());
      v === undefined && (v = Math.random());

      var theta = 2 * Math.PI * u;
      var phi = Math.acos(2 * v - 1);

      var vec = {};
      vec.x = (Math.sin(phi) * Math.cos(theta));
      vec.y = (Math.sin(phi) * Math.sin(theta));
      vec.z = (Math.cos(phi));

      return vec;
    }
  })()
};

function createTweenScrubber(tween, seekSpeed) {
  seekSpeed = seekSpeed || 0.001;

  function stop() {
    TweenMax.to(tween, 1, {timeScale: 0});
  }

  function resume() {
    TweenMax.to(tween, 1, {timeScale: 1});
  }

  function seek(dx) {
    var progress = tween.progress();
    var p = THREE.Math.clamp((progress + (dx * seekSpeed)), 0, 1);

    tween.progress(p);
  }

  var _cx = 0;

  // desktop
  var mouseDown = false;
  document.body.style.cursor = 'pointer';

  window.addEventListener('mousedown', function (e) {
    mouseDown = true;
    document.body.style.cursor = 'ew-resize';
    _cx = e.clientX;
    stop();
  });
  window.addEventListener('mouseup', function (e) {
    mouseDown = false;
    document.body.style.cursor = 'pointer';
    resume();
  });
  window.addEventListener('mousemove', function (e) {
    if (mouseDown === true) {
      var cx = e.clientX;
      var dx = cx - _cx;
      _cx = cx;

      seek(dx);
    }
  });
  // mobile
  window.addEventListener('touchstart', function (e) {
    _cx = e.touches[0].clientX;
    stop();
    e.preventDefault();
  });
  window.addEventListener('touchend', function (e) {
    resume();
    e.preventDefault();
  });
  window.addEventListener('touchmove', function (e) {
    var cx = e.touches[0].clientX;
    var dx = cx - _cx;
    _cx = cx;

    seek(dx);
    e.preventDefault();
  });
}
