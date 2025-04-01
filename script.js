// === گرفتن عناصر DOM (کامل) ===
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

// === متغیرهای حالت بازی ===
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

// === MediaPipe & Camera State ===
let stream = null;
let handLandmarker = null;
let lastVideoTime = -1;
let animationFrameId = null;

// === متغیرهای Hover ===
let hoverStartTime = null;
let currentHoverSection = null;
let hoverTimeoutId = null;
const HOVER_DURATION_MS = 800;

// === توابع کمکی ===
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function showScreen(screenElement) {
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

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function displayFeedback(message, type) {
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

// === مقداردهی اولیه MediaPipe ===
async function setupMediaPipe() {
    try {
        // MediaPipe Hands Initialization
        const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({
            maxNumHands: 1, // Detect only one hand
            modelComplexity: 1, // Use the more complex model (0 or 1)
            minDetectionConfidence: 0.6, // Minimum confidence for initial detection
            minTrackingConfidence: 0.6 // Minimum confidence for tracking landmarks
        });
        hands.onResults(onResults); // Set the callback function

        // Initialize the Hands solution
        await hands.initialize();
        handLandmarker = hands; // Store the initialized object
        console.log("MediaPipe Hands setup complete.");
        checkIfReadyToEnableStart(); // Check if we can enable the start button

    } catch (error) {
        console.error("Error setting up MediaPipe Hands:", error);
        if (permissionPrompt.classList.contains('active')) {
            errorMessage.textContent = "خطا در بارگذاری مدل دست.";
        }
        // Potentially disable features or show a persistent error message
    }
}

// === بررسی آمادگی برای فعال کردن دکمه شروع ===
function checkIfReadyToEnableStart() {
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

// === انتخاب حالت بازی ===
function selectGameMode(event) {
    selectedGameMode = event.target.dataset.gameMode;
    console.log("Game mode selected:", selectedGameMode);
    selectedGameModeInfoSpan.textContent = gameModeNames[selectedGameMode] || '';
    showScreen(mathModeSelectionDiv);
}

// === انتخاب نوع ریاضی ===
function selectMathMode(event) {
    selectedMathMode = event.target.dataset.mathMode;
    console.log("Math mode selected:", selectedMathMode);
    selectedGameModeInfoSpan2.textContent = gameModeNames[selectedGameMode] || '';
    selectedMathModeInfoSpan.textContent = mathModeNames[selectedMathMode] || '';
    permissionTitle.textContent = `بازی ${gameModeNames[selectedGameMode] || ''} - ${mathModeNames[selectedMathMode] || ''}`;
    showScreen(permissionPrompt);
    checkIfReadyToEnableStart();
}

// === شروع دوربین و بازی ===
async function startCameraAndGame() {
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
        videoElement.play().catch(playError => {
             console.error("Error playing video:", playError);
             errorMessage.textContent = "خطا در پخش ویدیو: " + playError.message;
             showScreen(permissionPrompt);
             gameActive = false;
             startButton.disabled = false; startButton.textContent = "شروع و اجازه دسترسی";
        });

    } catch (error) {
        console.error("Error accessing camera:", error);
        errorMessage.textContent = "خطا در دسترسی به دوربین: " + (error.message || error.name);
        showScreen(permissionPrompt);
        gameActive = false;
        startButton.disabled = false; startButton.textContent = "شروع و اجازه دسترسی";
    }
}

// === تنظیم نمایش آمار در هدر ===
function setupGameStats() {
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

// === ریست کردن وضعیت بازی ===
function resetGameState() {
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

// === حلقه پردازش ویدیو ===
async function predictWebcam() {
    if (!gameActive || gameIsOver || !handLandmarker || !videoElement.srcObject || videoElement.readyState < videoElement.HAVE_METADATA) {
        if (fingerIndicator) fingerIndicator.style.display = 'none';
        // Keep requesting frames if the game is supposed to be active but not ready
        if(gameActive && !gameIsOver) animationFrameId = requestAnimationFrame(predictWebcam);
        return;
    }

    // Ensure canvas dimensions match video dimensions
    if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
         canvasElement.width = videoElement.videoWidth;
         canvasElement.height = videoElement.videoHeight;
     }

    // Only send frames if the video time has changed
    const nowInMs = Date.now();
    if (videoElement.currentTime !== lastVideoTime) {
         lastVideoTime = videoElement.currentTime;
         try {
             // Send the current video frame to MediaPipe Hands
             await handLandmarker.send({ image: videoElement });
         }
         catch (sendError){
             console.error("Error sending frame to MediaPipe:", sendError);
             // Optionally handle the error, e.g., stop the game or show a message
         }
    }

    // Request the next frame
    animationFrameId = requestAnimationFrame(predictWebcam);
}


// === پردازش نتایج مدیاپایپ (با تصحیح آینه برای نشانگر) ===
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    let indexFingerTipNormalized = null; // Normalized landmark
    let indexFingerTipScreen = null; // Pixel coordinates on screen

     if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && gameActive && !gameIsOver) {
        const landmarks = results.multiHandLandmarks[0]; // Use the first detected hand

        // --- Optional: Draw landmarks/connections on canvas for debugging ---
        // drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
        // drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 3});
        // --- End Optional Drawing ---

        const fingerTipNormalized = landmarks[8]; // Index finger tip landmark (landmark #8)
        if (fingerTipNormalized && typeof fingerTipNormalized.x === 'number') {
            indexFingerTipNormalized = fingerTipNormalized; // Store normalized for potential use

            // *** Calculate screen coordinates for the DOM indicator (CORRECTED FOR MIRRORING) ***
            const videoRect = videoElement.getBoundingClientRect();

            // Calculate the *mirrored* horizontal normalized coordinate (0 to 1)
            // because the video feed is flipped via CSS (transform: scaleX(-1))
            const mirroredNormalizedX = 1 - fingerTipNormalized.x;

            // Convert mirrored normalized X to screen pixel coordinate
            const screenX = videoRect.left + mirroredNormalizedX * videoRect.width;

            // Y coordinate doesn't need mirroring
            const screenY = videoRect.top + fingerTipNormalized.y * videoRect.height;

            indexFingerTipScreen = { x: screenX, y: screenY }; // Store screen coords

            // Update the position and visibility of the DOM finger indicator
            if (fingerIndicator) {
                fingerIndicator.style.left = `${screenX}px`;
                fingerIndicator.style.top = `${screenY}px`;
                fingerIndicator.style.display = 'block'; // Show the indicator
            }
        }
    }

    canvasCtx.restore(); // Restore canvas state

    // --- Hover Logic (using screen coordinates) ---
    if (gameActive && interactionAllowed && !gameIsOver) {
         let sectionFound = null;
        if (indexFingerTipScreen) { // Use the calculated screen coordinates
             // Compare the finger's screen position with the answer sections' bounds
             const collisionScreenX = indexFingerTipScreen.x;
             const collisionScreenY = indexFingerTipScreen.y;

            answerSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (collisionScreenX >= rect.left && collisionScreenX <= rect.right &&
                    collisionScreenY >= rect.top && collisionScreenY <= rect.bottom) {
                    sectionFound = section; // Finger is hovering over this section
                }
            });
        }
        updateHoverState(sectionFound); // Update the visual hover state and timer
    } else {
        // If game not active, interaction not allowed, or game is over, clear hover state
        updateHoverState(null);
    }

    // Hide the finger indicator if no hand/fingertip is detected OR if game isn't active/running
    if (fingerIndicator && (!indexFingerTipScreen || !gameActive || gameIsOver)) {
        fingerIndicator.style.display = 'none';
    }
}


// === مدیریت وضعیت Hover و تایمر ===
function updateHoverState(sectionCurrentlyHovered) {
    if (gameIsOver) { // Stop all hover logic if game ended
        if (currentHoverSection) {
             clearTimeout(hoverTimeoutId); hoverTimeoutId = null;
             currentHoverSection.classList.remove('hand-hover');
             const oldProgressBar = currentHoverSection.querySelector('.hover-progress');
             if (oldProgressBar) oldProgressBar.style.width = '0%';
             currentHoverSection = null; hoverStartTime = null;
        }
        return;
    }

     // If hovering over the same section, update progress bar
     if (sectionCurrentlyHovered === currentHoverSection) {
        if (currentHoverSection && hoverStartTime && interactionAllowed) {
            const elapsedTime = Date.now() - hoverStartTime;
            const progress = Math.min(100, (elapsedTime / HOVER_DURATION_MS) * 100);
            const progressBar = currentHoverSection.querySelector('.hover-progress');
            if (progressBar) progressBar.style.width = `${progress}%`;
        }
        return; // No need to change hover state
    }

    // --- Hover state is changing ---
    // Clear any existing hover timeout and visual state
    clearTimeout(hoverTimeoutId); hoverTimeoutId = null;
    if (currentHoverSection) {
        currentHoverSection.classList.remove('hand-hover');
        const oldProgressBar = currentHoverSection.querySelector('.hover-progress');
        if (oldProgressBar) oldProgressBar.style.width = '0%'; // Reset progress bar
    }

    // Set the new hover section
    currentHoverSection = sectionCurrentlyHovered;

    // If hovering over a new section and interaction is allowed
    if (currentHoverSection && interactionAllowed) {
        currentHoverSection.classList.add('hand-hover'); // Apply hover style
        hoverStartTime = Date.now(); // Start the timer

        // Ensure progress bar exists and reset it
        let progressBar = currentHoverSection.querySelector('.hover-progress');
        if (!progressBar) {
             progressBar = document.createElement('div'); progressBar.className = 'hover-progress';
             currentHoverSection.appendChild(progressBar);
         }
        progressBar.style.width = '0%'; // Start progress from 0

        // Set timeout to trigger selection after HOVER_DURATION_MS
        hoverTimeoutId = setTimeout(() => {
            // Double-check if still hovering on the same section and interaction allowed
            if (currentHoverSection === sectionCurrentlyHovered && interactionAllowed && !gameIsOver) {
                 console.log("Selection triggered:", currentHoverSection.querySelector('.answer-number').textContent);
                 interactionAllowed = false; // Prevent immediate re-selection
                 checkAnswer(currentHoverSection); // Process the selected answer
            }
        }, HOVER_DURATION_MS);
    } else {
        // No section is being hovered over, or interaction is disallowed
        hoverStartTime = null; // Reset hover start time
    }
}

// === تولید سوال ===
function generateQuestion() {
    if (gameIsOver) return; // Don't generate questions if game is over
    console.log(`Generating question for mode: ${selectedMathMode}`);
    let num1, num2, correctAnswer, operatorSymbol;

    // Generate numbers and answer based on the selected math mode
    switch (selectedMathMode) {
        case 'add2':
            num1 = Math.floor(Math.random() * 90) + 10; // 10-99
            num2 = Math.floor(Math.random() * 90) + 10; // 10-99
            correctAnswer = num1 + num2;
            operatorSymbol = '+';
            break;
        case 'add3':
            num1 = Math.floor(Math.random() * 900) + 100; // 100-999
            num2 = Math.floor(Math.random() * 900) + 100; // 100-999
            correctAnswer = num1 + num2;
            operatorSymbol = '+';
            break;
        case 'subtract2':
            // Ensure num1 is larger than num2 for positive results
            num1 = Math.floor(Math.random() * 80) + 20; // 20-99
            num2 = Math.floor(Math.random() * (num1 - 10)) + 10; // 10 to num1-11
            correctAnswer = num1 - num2;
            operatorSymbol = '-';
            break;
        case 'divide':
            // Generate result and one operand first to ensure integer division
            const result = Math.floor(Math.random() * 11) + 2; // Result 2-12
            num2 = Math.floor(Math.random() * 9) + 2; // Divisor 2-10
            num1 = result * num2; // Calculate the dividend
            correctAnswer = result;
            operatorSymbol = '÷';
            break;
        case 'multiply':
        default: // Default to multiplication
            num1 = Math.floor(Math.random() * 10) + 1; // 1-10
            num2 = Math.floor(Math.random() * 10) + 1; // 1-10
            correctAnswer = num1 * num2;
            operatorSymbol = '×';
            break;
    }

    currentCorrectAnswer = correctAnswer; // Store the correct answer

    // Display the question parts
    operand1Span.textContent = num1;
    operatorSpan.textContent = operatorSymbol;
    operand2Span.textContent = num2;
    resultPlaceholderSpan.textContent = '?'; // Hide the result initially

    // Generate distractors (wrong answers)
    const options = [correctAnswer];
    while (options.length < 4) {
        let wrongAnswer;
        // Define a range for distractors based on the correct answer's magnitude
        const range = Math.max(5, Math.min(20, Math.floor(Math.abs(correctAnswer) * 0.3) + 2));
        const offset = Math.floor(Math.random() * range) + 1; // Random offset within the range

        // Generate a wrong answer - slightly higher probability for closer distractors
        if (correctAnswer < 10 && Math.random() < 0.5) { // For small answers, often +/- 1
             wrongAnswer = correctAnswer + (Math.random() < 0.5 ? 1 : -1);
        } else if (Math.random() < 0.7) { // Generate a nearby distractor
            wrongAnswer = correctAnswer + offset * (Math.random() < 0.5 ? 1 : -1); // Add or subtract offset
        } else { // Generate a potentially further distractor
            wrongAnswer = Math.max(1, correctAnswer + (Math.floor(Math.random() * (range * 2)) - range)); // Wider range
        }

        // Ensure the wrong answer is unique, not the correct answer, and positive
        if (!options.includes(wrongAnswer) && wrongAnswer !== correctAnswer && wrongAnswer > 0) {
             options.push(wrongAnswer);
        }
    }

    shuffleArray(options); // Randomize the order of options

    // Display the options in the answer sections
    answerSections.forEach((section, index) => {
        const numberSpan = section.querySelector('.answer-number');
        numberSpan.textContent = options[index];
        section.classList.remove('shake'); // Remove shake animation if present
        // Reset progress bar for the section
        const progressBar = section.querySelector('.hover-progress');
        if (progressBar) progressBar.style.width = '0%';
    });

    // Allow interaction after a short delay to prevent accidental selection
    setTimeout(() => { if (!gameIsOver) interactionAllowed = true; }, 200);

    console.log(`Question: ${num1} ${operatorSymbol} ${num2} = ? (Answer: ${correctAnswer}) Options: [${options.join(', ')}]`);
}


// === بررسی جواب ===
function checkAnswer(selectedSection) {
    // Ignore if no section provided, game not active, or game already over
    if (!selectedSection || !gameActive || gameIsOver) {
        if(!gameIsOver) interactionAllowed = true; // Re-allow interaction if game is still running
        return;
    }
    // Interaction is already disallowed by updateHoverState after selection trigger

    const selectedNumber = parseInt(selectedSection.querySelector('.answer-number').textContent);
    const isCorrect = (selectedNumber === currentCorrectAnswer);
    console.log(`Checking answer: Selected ${selectedNumber}, Correct: ${currentCorrectAnswer}. Correct: ${isCorrect}`);

    // Provide feedback and update score
    if (isCorrect) {
        displayFeedback("آفرین! درست بود 👍", "correct");
        // Increment score only in relevant game modes
        if (selectedGameMode !== 'free') {
            score++;
            scoreDisplay.textContent = score;
        }
    } else {
        displayFeedback("اشتباه بود... ☹️", "incorrect");
        // Apply penalty in challenge mode
        if (selectedGameMode === 'challenge') {
            score += CHALLENGE_PENALTY;
            score = Math.max(0, score); // Prevent score from going below zero
            scoreDisplay.textContent = score;
        }
        // Add shake animation to the incorrect selection
        selectedSection.classList.add('shake');
        setTimeout(() => { selectedSection.classList.remove('shake'); }, 300); // Remove shake after animation
    }

    // --- Clean up hover state ---
     if (currentHoverSection) {
         currentHoverSection.classList.remove('hand-hover');
         const progressBar = currentHoverSection.querySelector('.hover-progress');
         if (progressBar) progressBar.style.width = '0%';
         currentHoverSection = null; // Clear the currently hovered section
     }
     hoverStartTime = null; // Reset hover timer
     clearTimeout(hoverTimeoutId); hoverTimeoutId = null; // Clear selection timeout
    // --- End Hover Cleanup ---


    // --- Check for game end conditions ---
    let shouldEndGame = false;
    // Time Trial ends when target score is reached
    if (selectedGameMode === 'timeTrial' && score >= TARGET_SCORE) {
        shouldEndGame = true;
        console.log("Time Trial finished - Target score reached.");
    }
    // Speed Run end condition is handled in updateTimer

    // If game should end, call endGame()
    if (shouldEndGame) {
        endGame();
    } else {
        // Otherwise, generate the next question after a delay
        // Delay is longer for incorrect answers to allow reading feedback
        setTimeout(() => {
            if (!gameIsOver) { // Check again if game ended during the delay (e.g., timer ran out)
                generateQuestion(); // This will re-enable interactionAllowed
            }
        }, isCorrect ? 800 : 1200); // Shorter delay for correct, longer for incorrect
    }
}


// === توابع تایمر ===
function startTimer() {
    if (timerIntervalId) clearInterval(timerIntervalId); // Clear any existing timer
    console.log(`Timer started for mode: ${selectedGameMode}. Initial value: ${timerValue}`);
    // Update the timer every second
    timerIntervalId = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        console.log("Timer stopped.");
    }
}

function updateTimer() {
    // Stop timer if game is over or not active
    if (gameIsOver || !gameActive) {
        stopTimer();
        return;
    }

    // Decrement timer in Speed Run mode
    if (selectedGameMode === 'speed') {
        timerValue--;
        timerDisplay.textContent = formatTime(timerValue);
        // End game if timer reaches zero
        if (timerValue <= 0) {
            console.log("Speed Run finished - Time out.");
            endGame();
        }
    }
    // Increment timer in Time Trial mode (acts as a stopwatch)
    else if (selectedGameMode === 'timeTrial') {
        timerValue++;
        timerDisplay.textContent = formatTime(timerValue);
        // End condition for Time Trial is checked in checkAnswer (reaching score target)
    }
}

// === پایان بازی ===
function endGame() {
    if (gameIsOver) return; // Prevent multiple calls

    console.log("Ending game...");
    gameIsOver = true; // Set game over flag
    gameActive = false; // Stop the main game loop (predictWebcam)
    interactionAllowed = false; // Disable further interactions
    stopTimer(); // Stop the timer if running
    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Stop requesting frames
    if (fingerIndicator) fingerIndicator.style.display = 'none'; // Hide finger indicator

    // Prepare the final result message based on game mode
    let finalMessage = "";
    switch(selectedGameMode) {
        case 'challenge':
            finalMessage = `امتیاز نهایی شما در حالت چالشی: ${score}`;
            break;
        case 'speed':
            finalMessage = `در ${SPEED_RUN_DURATION} ثانیه حالت سرعتی، امتیاز شما: ${score}`;
            break;
        case 'timeTrial':
             // Check if target score was reached
            if (score >= TARGET_SCORE) {
                finalMessage = `عالی! شما در زمان ${formatTime(timerValue)} به ${TARGET_SCORE} امتیاز رسیدید!`;
            } else {
                 finalMessage = `زمان تمام شد! شما به ${score} امتیاز از ${TARGET_SCORE} رسیدید.`; // Or a different message
            }
            break;
        default: // free play
             finalMessage = "تمرین خوبی بود! به بازی ادامه دهید؟"; // Or a simpler message
             break;
    }
    finalResultMessage.textContent = finalMessage; // Display the message

    // Show the game over screen and hide game elements
    showScreen(gameOverScreen);
     mainHeader.classList.add('hidden'); mainHeader.classList.remove('active');
     mainFooter.classList.add('hidden'); mainFooter.classList.remove('active');
}


// === شروع مجدد یا تغییر حالت ===
function playAgain() {
    console.log("Play again selected.");
    // Go back to permission screen for the same mode
    selectedGameModeInfoSpan2.textContent = gameModeNames[selectedGameMode] || '';
    selectedMathModeInfoSpan.textContent = mathModeNames[selectedMathMode] || '';
    permissionTitle.textContent = `بازی ${gameModeNames[selectedGameMode] || ''} - ${mathModeNames[selectedMathMode] || ''}`;
    showScreen(permissionPrompt);
    checkIfReadyToEnableStart();
    // Game state will be reset when startCameraAndGame is called
}

function changeMode() {
    console.log("Change mode selected.");
    // Go back to the very first screen
    selectedGameMode = null;
    selectedMathMode = null;
    resetGameState(); // Reset score, timer, etc.
    showScreen(gameModeSelectionDiv); // Show game mode selection
}


// === راه‌اندازی اولیه و Event Listeners ===

// Add listeners to mode selection buttons
gameModeButtons.forEach(button => button.addEventListener('click', selectGameMode));
mathModeButtons.forEach(button => button.addEventListener('click', selectMathMode));

// Add listener to the main start button (after permission)
startButton.addEventListener('click', startCameraAndGame);

// Add listeners to back buttons
backToGameModeBtn.addEventListener('click', () => {
    // selectedGameMode is kept, selectedMathMode is cleared
    selectedMathMode = null;
    showScreen(gameModeSelectionDiv);
});
backToMathModeBtn.addEventListener('click', () => {
    // Go back to math mode selection (modes are kept)
    // No need to clear selectedMathMode here
    showScreen(mathModeSelectionDiv);
});

// Add listeners to game over screen buttons
playAgainButton.addEventListener('click', playAgain);
changeModeButton.addEventListener('click', changeMode);

// Start loading the MediaPipe model
setupMediaPipe();

// Add listener to handle page close/unload
window.addEventListener('beforeunload', () => {
    // Stop camera stream
    if (stream) stream.getTracks().forEach(track => track.stop());
    // Stop animation loop and timer
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    stopTimer();
    // Update game state variables
    gameActive = false; gameIsOver = true;
    // Hide indicator
     if (fingerIndicator) fingerIndicator.style.display = 'none';
});

// Show the initial screen (game mode selection)
showScreen(gameModeSelectionDiv);
console.log("Game script initialized. Waiting for user selections.");