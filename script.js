// === گرفتن عناصر DOM (کامل - بدون تغییر) ===
// ... (کد گرفتن عناصر مثل قبل) ...
const videoElement = document.getElementById('camera-feed');
const gameOverlay = document.getElementById('game-overlay');
const gameModeSelectionDiv = document.getElementById('game-mode-selection');
const gameModeButtons = document.querySelectorAll('.game-mode-btn');
const mathModeSelectionDiv = document.getElementById('math-mode-selection');
const mathModeButtons = document.querySelectorAll('.math-mode-btn');
const selectedGameModeInfoSpan = document.getElementById('selected-game-mode-info');
const backToGameModeBtn = document.getElementById('back-to-game-mode');
const permissionPrompt = document.getElementById('permission-prompt');
const permissionTitle = document.getElementById('permission-title');
const selectedGameModeInfoSpan2 = document.getElementById('selected-game-mode-info2');
const selectedMathModeInfoSpan = document.getElementById('selected-math-mode-info');
const backToMathModeBtn = document.getElementById('back-to-math-mode');
const startButton = document.getElementById('start-button');
const errorMessage = document.getElementById('error-message');
const mainHeader = document.getElementById('main-header');
const gameStatsDiv = document.getElementById('game-stats');
const scoreDisplayContainer = document.getElementById('score-display-container');
const scoreDisplay = document.getElementById('score-display');
const timerDisplayContainer = document.getElementById('timer-display-container');
const timerDisplay = document.getElementById('timer-display');
const gameContent = document.getElementById('game-content');
const problemDisplay = document.getElementById('problem-display');
const operand1Span = document.getElementById('operand1');
const operatorSpan = document.getElementById('operator');
const operand2Span = document.getElementById('operand2');
const resultPlaceholderSpan = document.getElementById('result-placeholder');
const answerSections = document.querySelectorAll('.answer-section');
const feedbackMessage = document.getElementById('feedback-message');
const mainFooter = document.getElementById('main-footer');
const gameOverScreen = document.getElementById('game-over-screen');
const finalResultMessage = document.getElementById('final-result-message');
const playAgainButton = document.getElementById('play-again-button');
const changeModeButton = document.getElementById('change-mode-button');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const fingerIndicator = document.getElementById('finger-indicator');


// === متغیرهای حالت بازی (بدون تغییر) ===
// ... (کد متغیرها مثل قبل) ...
let selectedGameMode = null;
let selectedMathMode = null;
let currentCorrectAnswer = null;
let score = 0;
let timerValue = 0; // ثانیه
let timerIntervalId = null;
let gameActive = false;
let interactionAllowed = true;
let gameIsOver = false;
let feedbackTimeoutId = null;
const TARGET_SCORE = 10;
const SPEED_RUN_DURATION = 60;
const CHALLENGE_PENALTY = -1;
const gameModeNames = { free: 'آزاد', challenge: 'چالشی', speed: 'سرعتی', timeTrial: 'زمانی' };
const mathModeNames = { add2: 'جمع ۲ رقمی', add3: 'جمع ۳ رقمی', subtract2: 'منهای ۲ رقمی', multiply: 'ضرب', divide: 'تقسیم' };
let stream = null;
let handLandmarker = null;
let lastVideoTime = -1;
let animationFrameId = null;
let hoverStartTime = null;
let currentHoverSection = null;
let hoverTimeoutId = null;
const HOVER_DURATION_MS = 800;


// === توابع کمکی (بدون تغییر) ===
function shuffleArray(array) { /* ... مثل قبل ... */
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function showScreen(screenElement) { /* ... مثل قبل ... */
    gameModeSelectionDiv.classList.remove('active'); gameModeSelectionDiv.classList.add('hidden');
    mathModeSelectionDiv.classList.remove('active'); mathModeSelectionDiv.classList.add('hidden');
    permissionPrompt.classList.remove('active'); permissionPrompt.classList.add('hidden');
    mainHeader.classList.remove('active'); mainHeader.classList.add('hidden');
    gameContent.classList.remove('active'); gameContent.classList.add('hidden');
    mainFooter.classList.remove('active'); mainFooter.classList.add('hidden');
    gameOverScreen.classList.remove('active'); gameOverScreen.classList.add('hidden');
    screenElement.classList.remove('hidden');
    screenElement.classList.add('active');
    console.log("Showing screen:", screenElement.id);
    if (fingerIndicator) fingerIndicator.style.display = 'none';
}
function formatTime(totalSeconds) { /* ... مثل قبل ... */
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function displayFeedback(message, type) { /* ... مثل قبل ... */
    if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId);
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'visible ' + type;
    feedbackTimeoutId = setTimeout(() => {
        feedbackMessage.classList.remove('visible');
        setTimeout(() => {
             if (!feedbackMessage.classList.contains('visible')) {
                 feedbackMessage.className = '';
             }
        }, 400);
    }, 1500);
}

// === مقداردهی اولیه MediaPipe و توابع مرتبط (بدون تغییر) ===
async function setupMediaPipe() { /* ... مثل قبل ... */
    try {
        const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        hands.onResults(onResults);
        await hands.initialize();
        handLandmarker = hands;
        console.log("MediaPipe Hands setup complete.");
        checkIfReadyToEnableStart();
    } catch (error) {
        console.error("Error setting up MediaPipe Hands:", error);
        if (permissionPrompt.classList.contains('active')) {
            errorMessage.textContent = "خطا در بارگذاری مدل دست.";
        }
    }
}
function checkIfReadyToEnableStart() { /* ... مثل قبل ... */
    if (permissionPrompt.classList.contains('active')) {
        if (handLandmarker && selectedMathMode && selectedGameMode) {
            startButton.textContent = "شروع و اجازه دسترسی";
            startButton.disabled = false;
            permissionPrompt.querySelector('i').style.display = 'none';
        } else {
            startButton.disabled = true;
            startButton.textContent = handLandmarker ? "حالت انتخاب نشده" : "لطفاً صبر کنید...";
             if(handLandmarker) permissionPrompt.querySelector('i').style.display = 'none';
             else permissionPrompt.querySelector('i').style.display = 'inline';
        }
    }
}
function selectGameMode(event) { /* ... مثل قبل ... */
    selectedGameMode = event.target.dataset.gameMode;
    console.log("Game mode selected:", selectedGameMode);
    selectedGameModeInfoSpan.textContent = gameModeNames[selectedGameMode] || '';
    showScreen(mathModeSelectionDiv);
}
function selectMathMode(event) { /* ... مثل قبل ... */
    selectedMathMode = event.target.dataset.mathMode;
    console.log("Math mode selected:", selectedMathMode);
    selectedGameModeInfoSpan2.textContent = gameModeNames[selectedGameMode] || '';
    selectedMathModeInfoSpan.textContent = mathModeNames[selectedMathMode] || '';
    permissionTitle.textContent = `بازی ${gameModeNames[selectedGameMode] || ''} - ${mathModeNames[selectedMathMode] || ''}`;
    showScreen(permissionPrompt);
    checkIfReadyToEnableStart();
}
async function startCameraAndGame() { /* ... مثل قبل ... */
    if (!handLandmarker || !selectedMathMode || !selectedGameMode) {
        errorMessage.textContent = "خطا: حالت بازی یا مدل دست آماده نیست."; return;
    }
    errorMessage.textContent = '';
    startButton.disabled = true; startButton.textContent = "در حال اتصال...";
    try {
        if (stream) stream.getTracks().forEach(track => track.stop());
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        videoElement.srcObject = stream;
        videoElement.onloadeddata = () => {
             canvasElement.width = videoElement.videoWidth;
             canvasElement.height = videoElement.videoHeight;
            resetGameState();
            showScreen(gameContent);
            mainHeader.classList.remove('hidden'); mainHeader.classList.add('active');
            mainFooter.classList.remove('hidden'); mainFooter.classList.add('active');
            setupGameStats();
            gameActive = true;
            gameIsOver = false;
            interactionAllowed = true;
            if (fingerIndicator) fingerIndicator.style.display = 'none';
             if (animationFrameId) cancelAnimationFrame(animationFrameId);
             predictWebcam();
            console.log(`Game starting - Mode: ${selectedGameMode}, Math: ${selectedMathMode}`);
            generateQuestion();
             if (selectedGameMode === 'speed' || selectedGameMode === 'timeTrial') {
                 startTimer();
             }
             startButton.textContent = "شروع و اجازه دسترسی";
             startButton.disabled = false; // Re-enable after successful start
        };
        videoElement.play().catch(playError => { /* ... مدیریت خطا ... */
             console.error("Error playing video:", playError);
             errorMessage.textContent = "خطا در پخش ویدیو: " + playError.message;
             showScreen(permissionPrompt);
             gameActive = false;
             startButton.disabled = false; startButton.textContent = "شروع و اجازه دسترسی";
        });
    } catch (error) { /* ... مدیریت خطا ... */
        console.error("Error accessing camera:", error);
        errorMessage.textContent = "خطا در دسترسی به دوربین: " + (error.message || error.name);
        showScreen(permissionPrompt);
        gameActive = false;
        startButton.disabled = false; startButton.textContent = "شروع و اجازه دسترسی";
    }
}
function setupGameStats() { /* ... مثل قبل ... */
    gameStatsDiv.classList.add('hidden');
    scoreDisplayContainer.classList.add('hidden');
    timerDisplayContainer.classList.add('hidden');
    if (selectedGameMode === 'challenge' || selectedGameMode === 'speed' || selectedGameMode === 'timeTrial') {
        scoreDisplayContainer.classList.remove('hidden');
        scoreDisplay.textContent = score;
        gameStatsDiv.classList.remove('hidden');
    }
    if (selectedGameMode === 'speed' || selectedGameMode === 'timeTrial') {
        timerDisplayContainer.classList.remove('hidden');
        timerDisplay.textContent = formatTime(timerValue);
        gameStatsDiv.classList.remove('hidden');
    }
}
function resetGameState() { /* ... مثل قبل ... */
    score = 0;
    if (selectedGameMode === 'speed') timerValue = SPEED_RUN_DURATION;
    else if (selectedGameMode === 'timeTrial') timerValue = 0;
    else timerValue = 0;
    stopTimer();
    gameIsOver = false;
    interactionAllowed = true;
    scoreDisplay.textContent = score;
    timerDisplay.textContent = formatTime(timerValue);
    feedbackMessage.classList.remove('visible'); feedbackMessage.className = '';
     if (fingerIndicator) fingerIndicator.style.display = 'none';
}
async function predictWebcam() { /* ... مثل قبل ... */
    if (!gameActive || gameIsOver || !handLandmarker || !videoElement.srcObject || videoElement.readyState < videoElement.HAVE_METADATA) {
        if (fingerIndicator) fingerIndicator.style.display = 'none';
        if(gameActive && !gameIsOver) animationFrameId = requestAnimationFrame(predictWebcam);
        return;
    }
    if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
         canvasElement.width = videoElement.videoWidth;
         canvasElement.height = videoElement.videoHeight;
     }
    const nowInMs = Date.now();
    if (videoElement.currentTime !== lastVideoTime) {
         lastVideoTime = videoElement.currentTime;
         try { await handLandmarker.send({ image: videoElement }); }
         catch (sendError){ console.error("Error sending frame to MediaPipe:", sendError); }
    }
    animationFrameId = requestAnimationFrame(predictWebcam);
}
function onResults(results) { /* ... مثل قبل با تصحیح آینه ... */
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    let indexFingerTipNormalized = null;
    let indexFingerTipScreen = null;
     if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && gameActive && !gameIsOver) {
        const landmarks = results.multiHandLandmarks[0];
        const fingerTipNormalized = landmarks[8];
        if (fingerTipNormalized && typeof fingerTipNormalized.x === 'number') {
            indexFingerTipNormalized = fingerTipNormalized;
            const videoRect = videoElement.getBoundingClientRect();
            const mirroredNormalizedX = 1 - fingerTipNormalized.x;
            const screenX = videoRect.left + mirroredNormalizedX * videoRect.width;
            const screenY = videoRect.top + fingerTipNormalized.y * videoRect.height;
            indexFingerTipScreen = { x: screenX, y: screenY };
            if (fingerIndicator) {
                fingerIndicator.style.left = `${screenX}px`;
                fingerIndicator.style.top = `${screenY}px`;
                fingerIndicator.style.display = 'block';
            }
        }
    }
    canvasCtx.restore();
    if (gameActive && interactionAllowed && !gameIsOver) {
         let sectionFound = null;
        if (indexFingerTipScreen) {
             const collisionScreenX = indexFingerTipScreen.x;
             const collisionScreenY = indexFingerTipScreen.y;
            answerSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (collisionScreenX >= rect.left && collisionScreenX <= rect.right &&
                    collisionScreenY >= rect.top && collisionScreenY <= rect.bottom) {
                    sectionFound = section;
                }
            });
        }
        updateHoverState(sectionFound);
    } else {
        updateHoverState(null);
    }
    if (fingerIndicator && (!indexFingerTipScreen || !gameActive || gameIsOver)) {
        fingerIndicator.style.display = 'none';
    }
}
function updateHoverState(sectionCurrentlyHovered) { /* ... مثل قبل ... */
    if (gameIsOver) {
        if (currentHoverSection) {
             clearTimeout(hoverTimeoutId); hoverTimeoutId = null;
             currentHoverSection.classList.remove('hand-hover');
             const oldProgressBar = currentHoverSection.querySelector('.hover-progress');
             if (oldProgressBar) oldProgressBar.style.width = '0%';
             currentHoverSection = null; hoverStartTime = null;
        }
        return;
    }
     if (sectionCurrentlyHovered === currentHoverSection) {
        if (currentHoverSection && hoverStartTime && interactionAllowed) {
            const elapsedTime = Date.now() - hoverStartTime;
            const progress = Math.min(100, (elapsedTime / HOVER_DURATION_MS) * 100);
            const progressBar = currentHoverSection.querySelector('.hover-progress');
            if (progressBar) progressBar.style.width = `${progress}%`;
        }
        return;
    }
    clearTimeout(hoverTimeoutId); hoverTimeoutId = null;
    if (currentHoverSection) {
        currentHoverSection.classList.remove('hand-hover');
        const oldProgressBar = currentHoverSection.querySelector('.hover-progress');
        if (oldProgressBar) oldProgressBar.style.width = '0%';
    }
    currentHoverSection = sectionCurrentlyHovered;
    if (currentHoverSection && interactionAllowed) {
        currentHoverSection.classList.add('hand-hover');
        hoverStartTime = Date.now();
        let progressBar = currentHoverSection.querySelector('.hover-progress');
        if (!progressBar) {
             progressBar = document.createElement('div'); progressBar.className = 'hover-progress';
             currentHoverSection.appendChild(progressBar);
         }
        progressBar.style.width = '0%';
        hoverTimeoutId = setTimeout(() => {
            if (currentHoverSection === sectionCurrentlyHovered && interactionAllowed && !gameIsOver) {
                 console.log("Selection triggered:", currentHoverSection.querySelector('.answer-number').textContent);
                 interactionAllowed = false;
                 checkAnswer(currentHoverSection);
            }
        }, HOVER_DURATION_MS);
    } else {
        hoverStartTime = null;
    }
}
function generateQuestion() { /* ... مثل قبل ... */
    if (gameIsOver) return;
    console.log(`Generating question for mode: ${selectedMathMode}`);
    let num1, num2, correctAnswer, operatorSymbol;
    switch (selectedMathMode) { /* ... منطق تولید سوال مثل قبل ... */
        case 'add2': num1 = Math.floor(Math.random() * 90) + 10; num2 = Math.floor(Math.random() * 90) + 10; correctAnswer = num1 + num2; operatorSymbol = '+'; break;
        case 'add3': num1 = Math.floor(Math.random() * 900) + 100; num2 = Math.floor(Math.random() * 900) + 100; correctAnswer = num1 + num2; operatorSymbol = '+'; break;
        case 'subtract2': num1 = Math.floor(Math.random() * 80) + 20; num2 = Math.floor(Math.random() * (num1 - 10)) + 10; correctAnswer = num1 - num2; operatorSymbol = '-'; break;
        case 'divide': const result = Math.floor(Math.random() * 11) + 2; num2 = Math.floor(Math.random() * 9) + 2; num1 = result * num2; correctAnswer = result; operatorSymbol = '÷'; break;
        case 'multiply': default: num1 = Math.floor(Math.random() * 10) + 1; num2 = Math.floor(Math.random() * 10) + 1; correctAnswer = num1 * num2; operatorSymbol = '×'; break;
    }
    currentCorrectAnswer = correctAnswer;
    operand1Span.textContent = num1; operatorSpan.textContent = operatorSymbol;
    operand2Span.textContent = num2; resultPlaceholderSpan.textContent = '?';
    const options = [correctAnswer];
    while (options.length < 4) { /* ... منطق تولید گزینه غلط مثل قبل ... */
        let wrongAnswer; const range = Math.max(5, Math.min(20, Math.floor(Math.abs(correctAnswer) * 0.3) + 2)); const offset = Math.floor(Math.random() * range) + 1;
        if (correctAnswer < 10 && Math.random() < 0.5) { wrongAnswer = correctAnswer + (Math.random() < 0.5 ? 1 : -1); }
        else if (Math.random() < 0.7) { wrongAnswer = correctAnswer + offset * (Math.random() < 0.5 ? 1 : -1); }
        else { wrongAnswer = Math.max(1, correctAnswer + (Math.floor(Math.random() * (range * 2)) - range)); }
        if (!options.includes(wrongAnswer) && wrongAnswer !== correctAnswer && wrongAnswer > 0) { options.push(wrongAnswer); }
    }
    shuffleArray(options);
    answerSections.forEach((section, index) => { /* ... نمایش گزینه‌ها مثل قبل ... */
        const numberSpan = section.querySelector('.answer-number'); numberSpan.textContent = options[index];
        section.classList.remove('shake');
        const progressBar = section.querySelector('.hover-progress');
        if (progressBar) progressBar.style.width = '0%';
    });
    // ** مهم: فعال کردن تعامل در اینجا اتفاق میفتد **
    setTimeout(() => { if (!gameIsOver) interactionAllowed = true; }, 200); // کمی تاخیر
    console.log(`Question: ${num1} ${operatorSymbol} ${num2} = ? (Answer: ${currentCorrectAnswer}) Options: [${options.join(', ')}]`);
}


// === بررسی جواب (<<< تغییر اصلی در اینجا >>>) ===
function checkAnswer(selectedSection) {
    if (!selectedSection || !gameActive || gameIsOver) {
        // اگر بازی تمام نشده، اجازه تعامل را باز کن (مثلا اگر تابع اشتباهی فراخوانی شد)
        if (!gameIsOver && !interactionAllowed) {
             interactionAllowed = true;
        }
        return;
    }
    // interactionAllowed قبلا توسط updateHoverState به false تغییر کرده است

    const selectedNumber = parseInt(selectedSection.querySelector('.answer-number').textContent);
    const isCorrect = (selectedNumber === currentCorrectAnswer);
    console.log(`Checking answer: Selected ${selectedNumber}, Correct: ${currentCorrectAnswer}. Correct: ${isCorrect}`);

    // --- پاک کردن وضعیت Hover فعلی ---
    // (این کار را زودتر انجام می‌دهیم تا قبل از فعال کردن مجدد تعامل، پاک شده باشد)
     if (currentHoverSection) {
         currentHoverSection.classList.remove('hand-hover');
         const progressBar = currentHoverSection.querySelector('.hover-progress');
         if (progressBar) progressBar.style.width = '0%';
         // currentHoverSection و hoverStartTime در انتهای تابع یا در updateHoverState ریست می‌شوند
     }
     // اطمینان از پاک شدن تایمر هاور
     clearTimeout(hoverTimeoutId); hoverTimeoutId = null;


    // --- بازخورد و امتیازدهی ---
    if (isCorrect) {
        displayFeedback("آفرین! درست بود 👍", "correct");
        if (selectedGameMode !== 'free') {
            score++;
            scoreDisplay.textContent = score;
        }
        // --- بررسی پایان بازی (فقط برای حالت‌هایی که با امتیاز تمام می‌شوند) ---
        let shouldEndGame = false;
        if (selectedGameMode === 'timeTrial' && score >= TARGET_SCORE) {
            shouldEndGame = true;
            console.log("Time Trial finished - Target score reached.");
        }

        // --- رفتن به سوال بعد یا پایان بازی ---
        if (shouldEndGame) {
            // با کمی تاخیر بازی را تمام کن تا کاربر فیدبک را ببیند
            setTimeout(endGame, 500);
        } else {
            // برو به سوال بعدی با تاخیر
            setTimeout(() => {
                if (!gameIsOver) { // دوباره چک کن بازی تمام نشده باشد
                    generateQuestion(); // این تابع خودش interactionAllowed را فعال می‌کند
                }
            }, 800); // تاخیر بعد از جواب درست
        }

    } else { // <<< اگر جواب اشتباه بود >>>
        displayFeedback("اشتباه بود... دوباره تلاش کن! ☹️", "incorrect");
        if (selectedGameMode === 'challenge') {
            score += CHALLENGE_PENALTY;
            score = Math.max(0, score);
            scoreDisplay.textContent = score;
        }
        // لرزش بخش انتخاب شده
        selectedSection.classList.add('shake');
        setTimeout(() => { selectedSection.classList.remove('shake'); }, 300);

        // *** مهم: به سوال بعدی نرو، فقط اجازه تعامل مجدد بده ***
        setTimeout(() => {
            if (!gameIsOver) { // فقط اگر بازی هنوز تمام نشده
                interactionAllowed = true; // اجازه بده دوباره همین سوال را جواب دهد
                console.log("Interaction re-enabled after incorrect answer on the same question.");
                // ریست کردن متغیرهای هاور برای اطمینان
                currentHoverSection = null;
                hoverStartTime = null;
            }
        }, 1200); // تاخیر تا کاربر فیدبک را ببیند و آماده تلاش مجدد شود
    }
}


// === توابع تایمر (بدون تغییر) ===
function startTimer() { /* ... مثل قبل ... */
    if (timerIntervalId) clearInterval(timerIntervalId);
    console.log(`Timer started for mode: ${selectedGameMode}. Initial value: ${timerValue}`);
    timerIntervalId = setInterval(updateTimer, 1000);
}
function stopTimer() { /* ... مثل قبل ... */
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        console.log("Timer stopped.");
    }
}
function updateTimer() { /* ... مثل قبل ... */
    if (gameIsOver || !gameActive) {
        stopTimer();
        return;
    }
    if (selectedGameMode === 'speed') {
        timerValue--;
        timerDisplay.textContent = formatTime(timerValue);
        if (timerValue <= 0) {
            console.log("Speed Run finished - Time out.");
            endGame(); // پایان بازی اگر زمان تمام شود
        }
    } else if (selectedGameMode === 'timeTrial') {
        timerValue++;
        timerDisplay.textContent = formatTime(timerValue);
        // پایان بازی Time Trial در checkAnswer با رسیدن به امتیاز کنترل می‌شود
    }
}

// === پایان بازی (بدون تغییر قابل توجه) ===
function endGame() { /* ... مثل قبل ... */
    if (gameIsOver) return;
    console.log("Ending game...");
    gameIsOver = true;
    gameActive = false;
    interactionAllowed = false;
    stopTimer();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (fingerIndicator) fingerIndicator.style.display = 'none';
    let finalMessage = "";
    switch(selectedGameMode) { /* ... پیام‌های پایان بازی مثل قبل ... */
        case 'challenge': finalMessage = `امتیاز نهایی شما در حالت چالشی: ${score}`; break;
        case 'speed': finalMessage = `در ${SPEED_RUN_DURATION} ثانیه حالت سرعتی، امتیاز شما: ${score}`; break;
        case 'timeTrial': if (score >= TARGET_SCORE) { finalMessage = `عالی! شما در زمان ${formatTime(timerValue)} به ${TARGET_SCORE} امتیاز رسیدید!`; } else { finalMessage = `زمان تمام شد! شما به ${score} امتیاز از ${TARGET_SCORE} رسیدید.`; } break;
        default: finalMessage = "تمرین خوبی بود! به بازی ادامه دهید؟"; break;
    }
    finalResultMessage.textContent = finalMessage;
    showScreen(gameOverScreen);
     mainHeader.classList.add('hidden'); mainHeader.classList.remove('active');
     mainFooter.classList.add('hidden'); mainFooter.classList.remove('active');
}

// === شروع مجدد یا تغییر حالت (بدون تغییر) ===
function playAgain() { /* ... مثل قبل ... */
    console.log("Play again selected.");
    selectedGameModeInfoSpan2.textContent = gameModeNames[selectedGameMode] || '';
    selectedMathModeInfoSpan.textContent = mathModeNames[selectedMathMode] || '';
    permissionTitle.textContent = `بازی ${gameModeNames[selectedGameMode] || ''} - ${mathModeNames[selectedMathMode] || ''}`;
    showScreen(permissionPrompt);
    checkIfReadyToEnableStart();
}
function changeMode() { /* ... مثل قبل ... */
    console.log("Change mode selected.");
    selectedGameMode = null;
    selectedMathMode = null;
    resetGameState();
    showScreen(gameModeSelectionDiv);
}

// === راه‌اندازی اولیه و Event Listeners (بدون تغییر) ===
gameModeButtons.forEach(button => button.addEventListener('click', selectGameMode));
mathModeButtons.forEach(button => button.addEventListener('click', selectMathMode));
startButton.addEventListener('click', startCameraAndGame);
backToGameModeBtn.addEventListener('click', () => { selectedMathMode = null; showScreen(gameModeSelectionDiv); });
backToMathModeBtn.addEventListener('click', () => { showScreen(mathModeSelectionDiv); }); // بازگشت بدون ریست
playAgainButton.addEventListener('click', playAgain);
changeModeButton.addEventListener('click', changeMode);
setupMediaPipe();
window.addEventListener('beforeunload', () => { /* ... مثل قبل ... */
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    stopTimer();
    gameActive = false; gameIsOver = true;
     if (fingerIndicator) fingerIndicator.style.display = 'none';
});
showScreen(gameModeSelectionDiv);
console.log("Game script initialized. Waiting for user selections.");