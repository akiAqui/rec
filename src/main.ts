import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// シェーダーマテリアル
const material = new THREE.ShaderMaterial({
  vertexShader: `void main() {
    gl_Position = vec4(position, 1.0);
}
`,
  fragmentShader: `
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    // UV座標を0〜1の範囲に正規化
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // シンプルな時間依存の色変化
    float color = 0.5 + 0.5 * sin(u_time + uv.x);

    gl_FragColor = vec4(vec3(color), 1.0);
}
`,
  uniforms: {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  },
});

// フルスクリーン平面メッシュ
const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(plane);

// 音声のセットアップ
const audio = new Audio();
audio.src = 'audio.mp3'; // 音声ファイルを指定
audio.loop = true;

// ユーザー操作後に録画と音声再生を開始
const startRecording = () => {
  // 音声ストリームを取得
  const audioStream = (audio as any).captureStream ? audio.captureStream() : null;
  if (!audioStream) {
    console.error('Audio captureStream is not supported in this browser.');
    return;
  }

  // 映像ストリームを取得
  const canvasStream = renderer.domElement.captureStream();
  if (!canvasStream) {
    console.error('Canvas captureStream is not supported in this browser.');
    return;
  }

  // 映像ストリームと音声ストリームを結合
  const combinedStream = new MediaStream();
  canvasStream.getTracks().forEach((track) => combinedStream.addTrack(track));
  audioStream.getTracks().forEach((track) => combinedStream.addTrack(track));

  // 録画のセットアップ
  const mediaRecorder = new MediaRecorder(combinedStream);
  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.click();
  };

  mediaRecorder.start();
  audio.play(); // 音声再生を開始

  const startTime = performance.now();

  const animate = () => {
    material.uniforms.u_time.value = (performance.now() - startTime) / 1000;
    renderer.render(scene, camera);

    if ((performance.now() - startTime) / 1000 < 10) {
      requestAnimationFrame(animate);
    } else {
      mediaRecorder.stop();
      audio.pause();
    }
  };

  animate();
};

// ユーザー操作を待つ
document.addEventListener('click', startRecording, { once: true });
console.log('Click anywhere to start recording.');

