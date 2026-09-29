import './style.css';
import * as THREE from 'three';

// ==========================================
// 1. 場景、畫布與渲染器 (含陰影與 HD-2D 氛圍)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color('#080912');
scene.fog = new THREE.FogExp2('#080912', 0.022); // 經典 HD-2D 地城深邃霧氣

const sizes = { width: window.innerWidth, height: window.innerHeight };
// 視角參數：改為經典 HD-2D 平視低仰角 (FOV 26°)，鏡頭放低以看到更多角色正面與牆面立體感
const camera = new THREE.PerspectiveCamera(26, sizes.width / sizes.height, 0.1, 1000);
scene.add(camera);

// 2.5D 固定平俯視角：目標設在角色上半身高度 (y=0.8)，相機高度 Y 壓低至 8.5
// 視角仰角約 28 度，大幅減少由上往下看到頭頂的比例，呈現角色的正面與挺拔立體感，且完全不露虛空
export const cameraTarget = new THREE.Vector3(0, 0.8, 0);
export const cameraOffset = new THREE.Vector3(0, 8.5, 16); // 經典平視 HD-2D 偏移

camera.position.copy(cameraTarget).add(cameraOffset);
camera.lookAt(cameraTarget);

const canvas = document.querySelector('#webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// 視窗自適應縮放
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ==========================================
// 2. 貼圖載入與像素銳利化設定
// ==========================================
const textureLoader = new THREE.TextureLoader();

function loadPixelTexture(url) {
  const tex = textureLoader.load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

// 地面石磚
const stoneTex1 = loadPixelTexture('/stone1.png');
const stoneTex2 = loadPixelTexture('/stone2.png');
const stoneTex3 = loadPixelTexture('/stone3.png');
const stoneTex4 = loadPixelTexture('/stone4.png');

// 專屬地城牆壁材質
const wallFaceTex = loadPixelTexture('/wall_face.png');             // 暗藍古石磚立面
const wallFaceMossTex = loadPixelTexture('/wall_face_moss.png');   // 青苔石磚立面
const wallTopTex = loadPixelTexture('/wall_top.png');               // 牆頂平整壓頂石
const wallTopCrackedTex = loadPixelTexture('/wall_top_cracked.png'); // 裂紋壓頂石
const wallCarvedTex = loadPixelTexture('/wall_carved.png');         // 石雕飾帶
const lanternTex = loadPixelTexture('/lantern.png');                 // 鍛鐵壁燈

// 地板材質
const materials = {
  0: new THREE.MeshStandardMaterial({ map: stoneTex1, roughness: 0.9, metalness: 0.1 }),
  3: new THREE.MeshStandardMaterial({ map: stoneTex2, roughness: 0.9, metalness: 0.1 }),
  4: new THREE.MeshStandardMaterial({ map: stoneTex3, roughness: 0.9, metalness: 0.1 }),
  1: new THREE.MeshStandardMaterial({ map: stoneTex4, roughness: 0.85, metalness: 0.15 }),
  2: new THREE.MeshStandardMaterial({ map: stoneTex4, roughness: 0.85, metalness: 0.15 }), // 碎石障礙
};

// 牆體材質組合 (Box 6 面：+X, -X, +Y, -Y, +Z, -Z)
const wallFaceMat = new THREE.MeshStandardMaterial({ map: wallFaceTex, roughness: 0.85, metalness: 0.15 });
const wallMossMat = new THREE.MeshStandardMaterial({ map: wallFaceMossTex, roughness: 0.9, metalness: 0.1 });
const wallTopMat = new THREE.MeshStandardMaterial({ map: wallTopTex, roughness: 0.8, metalness: 0.1 });
const wallTopCrackedMat = new THREE.MeshStandardMaterial({ map: wallTopCrackedTex, roughness: 0.8, metalness: 0.1 });
const wallCarvedMat = new THREE.MeshStandardMaterial({ map: wallCarvedTex, roughness: 0.75, metalness: 0.2 });

// 頂層方塊：頂面為壓頂石，四面為古石磚
const wallCapMaterials = [
  wallFaceMat, wallFaceMat, wallTopMat, wallFaceMat, wallFaceMat, wallFaceMat
];
const wallCapMossMaterials = [
  wallMossMat, wallMossMat, wallTopCrackedMat, wallMossMat, wallMossMat, wallMossMat
];
const wallPillarMaterials = [
  wallCarvedMat, wallCarvedMat, wallTopMat, wallCarvedMat, wallCarvedMat, wallCarvedMat
];

// ==========================================
// 3. 地圖陣列與殘破城牆建築生成
// ==========================================
const gridRows = 50;
const gridCols = 50;
const mapGrid = [];
const wallHeightMap = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

// 1) 鋪滿基礎地面 (隨機變體)
for (let row = 0; row < gridRows; row++) {
  const rowArray = [];
  for (let col = 0; col < gridCols; col++) {
    let tile = 0;
    const rand = Math.random();
    if (rand < 0.15) tile = 3;
    else if (rand < 0.20) tile = 4;
    rowArray.push(tile);
  }
  mapGrid.push(rowArray);
}

// 2) 中央主路線與路邊碎石
for (let i = 8; i < 42; i++) {
  mapGrid[i][24] = 1;
  mapGrid[i][25] = 1;

  if (Math.random() < 0.22) mapGrid[i][23] = 2;
  if (Math.random() < 0.22) mapGrid[i][26] = 2;
}

// 3) 生成古堡殘破城牆 (具備高低起伏破壞層次與轉角)
const wallSegments = [
  // 左側區域城牆遺跡
  { r: 12, c: 8, len: 6, dir: 'H', corner: true },
  { r: 20, c: 6, len: 7, dir: 'H', corner: false },
  { r: 28, c: 10, len: 5, dir: 'V', corner: true },
  { r: 35, c: 7, len: 6, dir: 'H', corner: false },
  { r: 16, c: 15, len: 5, dir: 'V', corner: false },
  { r: 32, c: 16, len: 6, dir: 'H', corner: true },

  // 右側區域城牆遺跡
  { r: 11, c: 32, len: 7, dir: 'H', corner: true },
  { r: 22, c: 30, len: 6, dir: 'V', corner: false },
  { r: 18, c: 38, len: 6, dir: 'H', corner: true },
  { r: 30, c: 34, len: 7, dir: 'H', corner: false },
  { r: 36, c: 31, len: 5, dir: 'V', corner: true },
  { r: 26, c: 41, len: 5, dir: 'V', corner: false },
];

const lanternPositions = [];

wallSegments.forEach((seg, sIdx) => {
  const isH = seg.dir === 'H';
  for (let k = 0; k < seg.len; k++) {
    const curR = isH ? seg.r : seg.r + k;
    const curC = isH ? seg.c + k : seg.c;

    if (curR < 2 || curR >= gridRows - 2 || curC < 2 || curC >= gridCols - 2) continue;
    // 避開中間主路線
    if (curC >= 23 && curC <= 26) continue;

    // 計算殘破牆壁的高低漸變 (中間高 3 層，兩端逐漸倒塌成 2 或 1 層)
    let height = 3;
    if (k === 0 || k === seg.len - 1) {
      height = Math.random() < 0.5 ? 1 : 2;
    } else if (k === 1 || k === seg.len - 2) {
      height = Math.random() < 0.7 ? 2 : 3;
    }

    mapGrid[curR][curC] = 5;
    wallHeightMap[curR][curC] = height;

    // 在牆壁斷裂處隨機掉落散落碎石塊
    if ((k === 0 || k === seg.len - 1) && Math.random() < 0.45) {
      const offsetR = curR + (Math.random() > 0.5 ? 1 : -1);
      const offsetC = curC + (Math.random() > 0.5 ? 1 : -1);
      if (offsetR >= 0 && offsetR < gridRows && offsetC >= 0 && offsetC < gridCols) {
        if (mapGrid[offsetR][offsetC] === 0 && !(offsetC >= 24 && offsetC <= 25)) {
          mapGrid[offsetR][offsetC] = 2;
        }
      }
    }
  }

  // 轉角 L 型延伸
  if (seg.corner) {
    const cornerR = isH ? seg.r + 1 : seg.r;
    const cornerC = isH ? seg.c + seg.len - 1 : seg.c + 1;
    if (cornerR < gridRows - 2 && cornerC < gridCols - 2 && !(cornerC >= 23 && cornerC <= 26)) {
      mapGrid[cornerR][cornerC] = 5;
      wallHeightMap[cornerR][cornerC] = 2;
    }
  }

  // 選定部分主要牆端設立壁燈
  if (sIdx % 2 === 0) {
    const lampR = isH ? seg.r : seg.r + 2;
    const lampC = isH ? seg.c + 2 : seg.c;
    lanternPositions.push({ r: lampR, c: lampC });
  }
});

// ==========================================
// 4. 3D 實體生成 (逐層堆疊無拉伸 + 陰影支援)
// ==========================================
const tileSize = 1;
const tileGeo = new THREE.BoxGeometry(tileSize, 1, tileSize);
const mapSize = mapGrid.length;

// 生成地面與障礙物
for (let row = 0; row < mapSize; row++) {
  for (let col = 0; col < mapGrid[row].length; col++) {
    const tileType = mapGrid[row][col];
    const posX = col - (mapSize / 2) + 0.5;
    const posZ = row - (mapSize / 2) + 0.5;

    if (tileType === 5) {
      // 牆壁實體由下方程式專門建構 (避免拉伸)
      continue;
    }

    const currentMaterial = materials[tileType] || materials[0];
    const tile = new THREE.Mesh(tileGeo, currentMaterial);
    tile.position.set(posX, 0.5, posZ);
    tile.receiveShadow = true;

    if (tileType === 2) {
      // 凸起的碎石障礙
      tile.scale.set(0.9, 1.3, 0.9);
      tile.position.y = 1.3 / 2;
      tile.castShadow = true;
    }

    scene.add(tile);
  }
}

// 專屬建構無拉伸的古堡石牆 (逐層模組化 1x1 堆疊，保持 16px 像素比例完美對齊)
for (let row = 0; row < mapSize; row++) {
  for (let col = 0; col < mapGrid[row].length; col++) {
    if (mapGrid[row][col] !== 5) continue;

    const height = wallHeightMap[row][col] || 2;
    const posX = col - (mapSize / 2) + 0.5;
    const posZ = row - (mapSize / 2) + 0.5;

    for (let layer = 0; layer < height; layer++) {
      const isTop = (layer === height - 1);
      let blockMat;

      if (isTop) {
        // 頂層方塊：帶壓頂石
        const isMossy = Math.random() < 0.25;
        blockMat = isMossy ? wallCapMossMaterials : wallCapMaterials;
      } else {
        // 牆身中下層：深藍石磚或青苔石磚
        blockMat = (layer === 0 && Math.random() < 0.3) ? wallMossMat : wallFaceMat;
      }

      const block = new THREE.Mesh(tileGeo, blockMat);
      block.position.set(posX, layer + 0.5, posZ);
      block.castShadow = true;
      block.receiveShadow = true;
      scene.add(block);
    }
  }
}

// ==========================================
// 5. HD-2D 壁燈與微光點光源系統 (暖光搖曳)
// ==========================================
const lanternGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);
const lanternMat = new THREE.MeshStandardMaterial({
  map: lanternTex,
  emissive: new THREE.Color('#ff8822'),
  emissiveIntensity: 1.6,
  roughness: 0.4,
  metalness: 0.3
});

const animatedLights = [];

lanternPositions.forEach((pos, idx) => {
  const h = wallHeightMap[pos.r]?.[pos.c] || 2;
  const lx = pos.c - (mapSize / 2) + 0.5;
  const lz = pos.r - (mapSize / 2) + 0.5;
  const ly = h + 0.25; // 安裝在牆頂微凸處

  // 3D 壁燈本體
  const lanternMesh = new THREE.Mesh(lanternGeo, lanternMat);
  lanternMesh.position.set(lx, ly, lz);
  lanternMesh.castShadow = true;
  scene.add(lanternMesh);

  // 溫暖的橘黃色地城火光
  const pointLight = new THREE.PointLight('#ff9d3a', 3.8, 9, 1.4);
  pointLight.position.set(lx, ly + 0.2, lz);
  // 前 4 盞主要壁燈啟用投影，兼顧畫質與極致效能
  if (idx < 4) {
    pointLight.castShadow = true;
    pointLight.shadow.bias = -0.002;
    pointLight.shadow.mapSize.width = 512;
    pointLight.shadow.mapSize.height = 512;
  }
  scene.add(pointLight);

  animatedLights.push({
    light: pointLight,
    baseIntensity: 3.8,
    speed: 4 + Math.random() * 3,
    phase: Math.random() * Math.PI * 2
  });
});

// ==========================================
// 6. HD-2D 電影級光影環境設定
// ==========================================
// 1) 深藍紫環境冷底光
const ambientLight = new THREE.AmbientLight('#121528', 1.8);
scene.add(ambientLight);

// 2) 冷調微月光 / 天頂斜射光 (投射出長條深色陰影)
const dirLight = new THREE.DirectionalLight('#a2b7ed', 2.8);
dirLight.position.set(22, 36, 18);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 90;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.bias = -0.0006;
scene.add(dirLight);

// 3) 天地半球光 (冷暖過渡自然)
const hemiLight = new THREE.HemisphereLight('#252b48', '#0c0d16', 0.8);
scene.add(hemiLight);

// ==========================================
// 7. 渲染迴圈與動態火光呼吸效果
// ==========================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  // 壁燈燭火微動搖曳 (Procedural Torch Flicker)
  animatedLights.forEach(item => {
    const flicker = Math.sin(elapsedTime * item.speed + item.phase) * 0.35 +
                    Math.cos(elapsedTime * item.speed * 2.1 + item.phase) * 0.2;
    item.light.intensity = item.baseIntensity + flicker;
  });

  // 保持相機固定鎖定在目標點 (未來更新 cameraTarget 即可直接跟隨角色移動)
  camera.position.copy(cameraTarget).add(cameraOffset);
  camera.lookAt(cameraTarget);

  renderer.render(scene, camera);
}

animate();