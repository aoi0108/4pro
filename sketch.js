let video;
let detections = [];
let gameStarted = false;
let gameState = 'start';
let countdownValue = 3;
let countdownStartTime = 0;
let drinkingStartTime = 0;
let drinkingDuration = 4000;
let gameResult = null;
let winSound;
let loseSound;
let soundPlayed = false;

// 風船アニメーション用の変数
let balloons = [];
let confetti = [];
let animationStartTime = 0;
let showAnimation = false;

const MOUTH_OPEN_THRESHOLD = 15;

function preload() {
    winSound = loadSound('assets/winsound.mp3');
    loseSound = loadSound('assets/losesound.mp3');
}

async function setup() {
    let canvas = createCanvas(640, 480);
    canvas.parent('canvas-container');
    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();

    // ビデオストリームの状態を確認
    video.elt.addEventListener('loadedmetadata', () => {
        console.log("✅ ビデオストリーム準備完了");
        console.log("ビデオサイズ:", video.elt.videoWidth, "x", video.elt.videoHeight);
        // ビデオの準備ができたら顔検出を開始
        setTimeout(detectFace, 1000);
    });

    // モデル読み込み
    await faceapi.nets.tinyFaceDetector.loadFromUri('models/tiny_face_detector');
    await faceapi.nets.faceLandmark68Net.loadFromUri('models/face_landmark_68');

    console.log("✅ モデル読み込み完了");

    // 準備完了ボタンのイベントリスナーを追加
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', startGame);

    // 初期画面を表示
    drawStartScreen();
}

async function detectFace() {
    // ビデオが準備できているかチェック
    if (!video || !video.elt || video.elt.readyState < 2) {
        console.log("⏳ ビデオ準備中...", video.elt.readyState);
        setTimeout(detectFace, 500);
        return;
    }

    // より緩い設定に変更
    const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,      // より大きなサイズ
        scoreThreshold: 0.3  // より低い閾値
    });

    try {
        detections = await faceapi.detectAllFaces(video.elt, options).withFaceLandmarks();
        console.log("🔄 自動検出結果:", detections.length);

        // 検出できた場合の詳細情報
        if (detections.length > 0) {
            console.log("✅ 自動検出スコア:", detections[0].detection.score);
        }
    } catch (error) {
        console.error("❌ 自動検出エラー:", error);
    }

    setTimeout(detectFace, 200); // 推論を定期実行
}

async function manualDetect() {
    if (!gameStarted) return;

    console.log("🔍 手動検出を実行中...");
    console.log("ビデオ状態:", video.elt.readyState, video.elt.videoWidth, video.elt.videoHeight);

    const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.7
    });

    try {
        const result = await faceapi.detectAllFaces(video.elt, options).withFaceLandmarks();
        console.log("🎯 手動検出結果:", result.length);
        if (result.length > 0) {
            console.log("✅ 検出詳細:", result[0].detection);
            detections = result;
        } else {
            console.log("❌ 顔が検出されませんでした");
        }
    } catch (error) {
        console.error("🚫 手動検出エラー:", error);
    }
}

async function startGame() {
    console.log("ゲーム開始！");
    gameStarted = true;
    gameState = 'countdown';
    countdownValue = 3;
    countdownStartTime = millis();

    const startButton = document.getElementById('startButton');
    startButton.style.display = 'none';

    // ビデオストリームを開始
    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();

    // ビデオストリームの状態を確認
    video.elt.addEventListener('loadedmetadata', () => {
        console.log("✅ ビデオストリーム準備完了");
        console.log("ビデオサイズ:", video.elt.videoWidth, "x", video.elt.videoHeight);
        // ビデオの準備ができたら顔検出を開始
        setTimeout(detectFace, 1000);
    });


}

function draw() {

    if (gameState === 'start') {
        drawStartScreen();
        return;
    }

    background(0);

    // ビデオを左右反転して描画
    if (video && video.elt && video.elt.readyState >= 2) {
        push();
        scale(-1, 1); // X軸方向に反転
        image(video, -width, 0); // 反転後の位置調整
        pop();
    }

    if (gameState === 'countdown') {
        drawCountdown();
    } else if (gameState === 'drinking') {
        drawDrinking();
    } else if (gameState === 'result') {
        drawResult();
    } else if (gameState === 'playing') {
        drawGameplay();
    }

    // if (gameState === 'result' && keyIsPressed && key === ' ') {
    //     restartGame();
    // }

}

function drawCountdown() {
    // カウントダウンロジック
    let elapsed = millis() - countdownStartTime;

    if (elapsed < 1000) {
        countdownValue = 3;
    } else if (elapsed < 2000) {
        countdownValue = 2;
    } else if (elapsed < 3000) {
        countdownValue = 1;
    } else if (elapsed < 4000) {
        countdownValue = 0; // "GO!"を表示

    } else {
        // カウントダウン終了、ゲーム開始
        gameState = 'drinking';
        drinkingStartTime = millis();
        console.log("💊 薬を飲む時間開始！");
        return;
    }

    // カウントダウン表示
    fill('white');
    stroke('black');
    strokeWeight(3);
    textSize(120);
    textAlign(CENTER, CENTER);

    if (countdownValue > 0) {
        text(countdownValue, width / 2, height / 2);
    } else {
        fill('white');
        textSize(80);
        text("GO! ", width / 2, height / 2);
    }

    // カウントダウン中の説明
    if (countdownValue > 0) {
        fill('white');
        noStroke();
        textSize(24);
        text("薬を飲み込む準備をしよう！", width / 2, height / 2 + 100);
    } else {
        fill('white');
        textSize(30);
        text("今だ！薬を飲み込もう！", width / 2, height / 2 + 100);
    }
}
function drawDrinking() {
    let elapsed = millis() - drinkingStartTime;
    let remaining = drinkingDuration - elapsed;

    if (remaining <= 0) {
        // 薬を飲む時間終了、ゲーム本編開始
        judgeResult();
        gameState = 'result';
        console.log("🎮 結果判定完了！");
        return;
    }

    // 薬を飲む時間の表示
    fill('white');
    stroke('black');
    strokeWeight(2);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("薬を飲み込み中...", width / 2, height / 2 - 50);

    // 残り時間表示
    fill('white');
    textSize(32);
    let remainingSeconds = Math.ceil(remaining / 1000);
    text(`残り ${remainingSeconds} 秒`, width / 2, height / 2 + 20);

    // プログレスバー
    let progress = elapsed / drinkingDuration;
    fill(114, 149, 198);
    rect(width / 4, height / 2 + 60, width / 2, 20);
    fill(217, 217, 217);
    rect(width / 4, height / 2 + 60, (width / 2) * progress, 20);

    // 指示
    fill('white');
    textSize(18);
    text("飲み込めたら口を開けて変顔してね！", width / 2, height / 2 + 100);
}

function judgeResult() {
    console.log("結果判定中...");
    console.log("検出数：", detections.length);

    if (detections.length > 0) {
        const mouth = detections[0].landmarks.getMouth();
        const open = isMouthOpen(mouth);

        gameResult = open ? 'win' : 'lose';
        console.log("📋 判定結果:", gameResult);
        console.log("口の状態:", open ? "開いてる" : "閉じてる");
        if (!soundPlayed) {
            if (gameResult === 'win' && winSound) {
                winSound.setVolume(0.3);
                winSound.play();
                startWinAnimation();
            } else if (gameResult === 'lose' && loseSound) {
                loseSound.setVolume(0.3);
                loseSound.play();
            }
            soundPlayed = true;
        }
    } else {
        // 顔が検出されない場合はLOSE
        gameResult = 'lose';
        console.log("📋 判定結果: 顔が検出されませんでした");

    }
}

function startWinAnimation() {
    showAnimation = true;
    animationStartTime = millis();
    balloons = [];
    confetti = [];

    // 風船を作成
    for (let i = 0; i < 8; i++) {
        balloons.push(new Balloon(random(width), height + 50, i));
    }

    // 紙吹雪を作成
    for (let i = 0; i < 50; i++) {
        confetti.push(new Confetti(random(width), -10));
    }
}

// 風船クラス
class Balloon {
    constructor(x, y, index) {
        this.x = x;
        this.y = y;
        this.targetY = random(50, 200);
        this.size = random(30, 50);
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
        this.color = this.colors[index % this.colors.length];
        this.swayAmount = random(1, 3);
        this.swaySpeed = random(0.02, 0.05);
        this.floatSpeed = random(1, 2);
        this.stringLength = random(80, 120);
    }

    update() {
        // 上昇運動
        if (this.y > this.targetY) {
            this.y -= this.floatSpeed;
        }

        // 左右の揺れ
        this.x += sin(millis() * this.swaySpeed) * this.swayAmount;

        // 画面外チェック
        if (this.x < -50) this.x = width + 50;
        if (this.x > width + 50) this.x = -50;
    }

    display() {
        push();

        // 風船の紐
        stroke(100);
        strokeWeight(2);
        line(this.x, this.y + this.size / 2, this.x, this.y + this.size / 2 + this.stringLength);

        // 風船本体
        fill(this.color);
        stroke(0);
        strokeWeight(2);
        ellipse(this.x, this.y, this.size, this.size * 1.2);

        // ハイライト
        fill(255, 255, 255, 150);
        noStroke();
        ellipse(this.x - this.size / 4, this.y - this.size / 4, this.size / 3, this.size / 4);

        pop();
    }
}

// 紙吹雪クラス
class Confetti {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = random(-2, 2);
        this.vy = random(1, 4);
        this.size = random(5, 12);
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.2, 0.2);
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
        this.color = random(this.colors);
        this.gravity = 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;

        // 風の影響
        this.vx += random(-0.1, 0.1);
    }

    display() {
        push();
        translate(this.x, this.y);
        rotate(this.rotation);
        fill(this.color);
        noStroke();
        rectMode(CENTER);
        rect(0, 0, this.size, this.size);
        pop();
    }

    isOffScreen() {
        return this.y > height + 50;
    }
}

function drawResult() {
    // 背景をビデオで表示
    if (video && video.elt && video.elt.readyState >= 2) {
        push();
        scale(-1, 1);
        image(video, -width, 0);
        pop();
    }

    // WIN時のアニメーション表示
    if (showAnimation && gameResult === 'win') {
        updateAndDrawAnimation();
    }

    // 結果表示
    fill('white');
    strokeWeight(3);
    rect(width / 4, height / 2 - 100, width / 2, 200);

    // 結果テキスト
    noStroke();
    textAlign(CENTER, CENTER);

    if (gameResult === 'win') {
        fill(198, 114, 114);
        textSize(64);
        text("WIN", width / 2, height / 2 - 30);

        fill('black');
        textSize(20);
        text("自分に勝ちました！素晴らしい👏", width / 2, height / 2 + 20);
    } else {
        fill(114, 149, 198);
        textSize(64);
        text("LOSE", width / 2, height / 2 - 30);

        fill('black');
        textSize(20);
        text("焦らないで！一旦落ち着こう！", width / 2, height / 2 + 20);
    }

    // リスタートの案内
    fill('red');
    textSize(18);
    text("画面をクリックして再挑戦", width / 2, height / 2 + 60);
}

function updateAndDrawAnimation() {
    // 風船のアニメーション
    for (let balloon of balloons) {
        balloon.update();
        balloon.display();
    }

    // 紙吹雪のアニメーション
    for (let i = confetti.length - 1; i >= 0; i--) {
        confetti[i].update();
        confetti[i].display();

        // 画面外に出た紙吹雪を削除
        if (confetti[i].isOffScreen()) {
            confetti.splice(i, 1);
        }
    }

    // 一定時間後にアニメーション終了
    if (millis() - animationStartTime > 10000) { // 10秒間
        showAnimation = false;
    }
}

function drawGameplay() {
    console.log("検出数:", detections.length);

    // デバッグ用：常にテスト表示
    // fill('yellow');
    // textSize(16);
    // text("テスト表示", 20, 20);

    // 手動検出テスト（キーボードでトリガー）
    if (keyIsPressed && key === 't') {
        manualDetect();
    }

    if (detections.length > 0) {
        const mouth = detections[0].landmarks.getMouth();
        const open = isMouthOpen(mouth);

        // デバッグ用：口の状態をコンソールに出力
        console.log("口の状態:", open ? "開いてる" : "閉じてる");

        push();
        scale(-1, 1); // X軸方向に反転
        translate(-width, 0); // 反転後の位置調整

        // 口の輪郭
        // noFill();
        // stroke(open ? 'red' : 'green');
        // strokeWeight(2);
        // beginShape();
        // mouth.forEach(p => vertex(p.x, p.y));
        // endShape();
        pop();

        // テキスト表示
        noStroke();
        fill(open ? 'red' : 'blue');
        textSize(32);
        textAlign(LEFT, TOP);
        text(open ? "WIN!🎉" : "LOSE...😢", 20, 40);

        // デバッグ用：座標も表示
        // fill('cyan');
        // textSize(16);
        // text(`口の距離: ${dist(mouth[13].x, mouth[13].y, mouth[19].x, mouth[19].y).toFixed(1)}`, 20, 80);
    } else {
        // 検出されない場合の表示
        fill('orange');
        textSize(24);
        text("顔が検出されていません", 20, 40);

        // 手動検出の案内
        fill('white');
        textSize(16);
        text("'t'キーを押して手動検出テスト", 20, 100);

        // ビデオの状態表示
        fill('gray');
        textSize(14);
        text(`ビデオ準備状態: ${video.elt.readyState}`, 20, 120);
        text(`ビデオサイズ: ${video.elt.videoWidth} x ${video.elt.videoHeight}`, 20, 140);
    }
}

function drawStartScreen() {
    background(176, 224, 230);

    // タイトル
    fill('black');
    textSize(48);
    textAlign(CENTER, CENTER);
    text("変顔de服薬", width / 2, height / 2 - 50);

    // 説明
    textSize(20);
    text("「3,2,1」のカウントダウンで薬を飲む心の準備！\n飲み込めたらカメラに向かって変顔をしてね！", width / 2, height / 2 + 20);

    // ボタンを押す案内
    textSize(16);
    text("「準備完了！」ボタンを押してスタート", width / 2, height / 2 + 80);
}

function isMouthOpen(mouth) {
    const top = mouth[13];   // 上唇中央
    const bottom = mouth[19]; // 下唇中央
    const d = dist(top.x, top.y, bottom.x, bottom.y);
    return d > MOUTH_OPEN_THRESHOLD;
}

function restartGame() {
    console.log("🔄 ゲームリスタート");
    gameState = 'countdown';
    countdownValue = 3;
    countdownStartTime = millis();
    gameResult = null;
    detections = [];
    soundPlayed = false;
}

// keyPressed関数を追加（リスタート用）
// function keyPressed() {
//     if (gameState === 'result' && key === ' ') {
//         restartGame();
//     }
// }


function mousePressed() {
    if (gameState === 'result') {
        restartGame();
    }
}
// 既存のdrawGameplay関数は削除または用途を変更
function drawGameplay() {
    // このフェーズは今回は使わないので、結果画面から直接リスタートに移行
    drawResult();
}
