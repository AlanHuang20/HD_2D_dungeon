import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. 建立場景
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1a2e'); // 深藍色背景

// 2. 建立攝影機
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 5, 10);
scene.add(camera);

// 3. 建立渲染器
const canvas = document.querySelector('#webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 4. 初始化 OrbitControls (上帝視角控制器)
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; // 開啟拖曳時的滑順慣性

// 5. 載入像素紋理與 HD-2D 關鍵魔法
const textureLoader = new THREE.TextureLoader();
const floorTexture = textureLoader.load('/floor.png');
// 關閉線性模糊，強制使用最近鄰插值，保持 16-bit 像素的絕對銳利！
floorTexture.magFilter = THREE.NearestFilter;
// --- 補上這三行，開啟重複平鋪魔法 ---
floorTexture.wrapS = THREE.RepeatWrapping; // 允許水平方向重複
floorTexture.wrapT = THREE.RepeatWrapping; // 允許垂直方向重複
floorTexture.repeat.set(10, 10);           // 設定水平與垂直各重複 10 次

// 6. 鋪設 3D 地板
const geometry = new THREE.PlaneGeometry(10, 10);
const material = new THREE.MeshBasicMaterial({
  map: floorTexture,
  side: THREE.DoubleSide
});
const floor = new THREE.Mesh(geometry, material);
floor.rotation.x = -Math.PI / 2; // 將平面放倒
scene.add(floor);

// 7. 啟動渲染迴圈
function animate() {
  requestAnimationFrame(animate);

  // 持續更新控制器，讓阻尼效果生效
  controls.update();

  renderer.render(scene, camera);
}

animate();