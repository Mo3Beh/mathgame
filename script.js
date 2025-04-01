// گرفتن عناصر DOM (بخش‌های جدید اضافه شدند)
const videoElement = document.getElementById('camera-feed');
const modeSelectionDiv = document.getElementById('mode-selection');
const modeButtons = document.querySelectorAll('.mode-btn');
const permissionPrompt = document.getElementById('permission-prompt');
const permissionTitle = document.getElementById('permission-title');
const selectedModeInfo = document.getElementById('selected-mode-info');
const startButton = document.getElementById('start-button');
const errorMessage = document.getElementById('error-message');
const mainHeader = document.getElementById('main-header');
const gameContent = document.getElementById('game-content');
const problemDisplay = document.getElementById('problem-display');
const operand1Span = document.getElementById('operand1');
const operatorSpan = document.getElementById('operator');
const operand2Span = document.getElementById('operand2');
const resultPlaceholderSpan = document.getElementById('result-placeholder');
const answerSections = document.querySelectorAll('.answer-section');
const feedbackMessage = document.getElementById('feedback-message');
const mainFooter = document.getElementById('main-footer');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

let currentGameMode = null; // <<< برای ذخیره حالت بازی انتخاب شده
const gameModeNames = { // نام فارسی حالت‌ها برای نمایش
    add2: 'جمع ۲ رقمی',
    add3: 'جمع ۳ رقمی',
    subtract2: 'منهای ۲ رقمی',
    multiply: 'ضرب',
    divide: 'تقسیم',
};

let currentCorrectAnswer = null;
let stream = null;
let handLandmarker = null;
let gameActive = false;
let lastVideoTime = -1;
let animationFrameId = null;

// --- متغیرهای Hover با دست (مثل قبل) ---
let hoverStartTime = null;
let currentHoverSection = null;
let hoverTimeoutId = null;
const HOVER_DURATION_MS = 800;
let interactionAllowed = true;

// --- توابع کمکی (shuffleArray, displayFeedback مثل قبل) ---
function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }
function displayFeedback(message, type) { feedbackMessage.textContent = message; feedbackMessage.className = 'visible'; feedbackMessage.classList.add(type); setTimeout(() => { feedbackMessage.classList.remove('visible'); }, 1500); }

// --- مقداردهی اولیه MediaPipe Hands (مثل قبل) ---
async function setupMediaPipe() {
    try {
        const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        hands.onResults(onResults);
        await hands.initialize();
        handLandmarker = hands;
        // دکمه شروع فقط زمانی فعال می‌شود که مدیاپایپ آماده باشد *و* کاربر حالت را انتخاب کرده باشد
        checkIfReadyToEnableStart();
        console.log("MediaPipe Hands setup complete and initialized.");
    } catch (error) {
        console.error("Error setting up MediaPipe Hands:", error);
        errorMessage.textContent = "خطا در بارگذاری مدل تشخیص دست.";
        // در حالت خطا، ممکن است لازم باشد دکمه‌های حالت هم غیرفعال شوند یا پیامی نمایش داده شود
    }
}

// --- تابع جدید: بررسی آمادگی برای فعال کردن دکمه شروع ---
function checkIfReadyToEnableStart() {
    if (handLandmarker && currentGameMode) {
        startButton.textContent = "شروع و اجازه دسترسی";
        startButton.disabled = false;
        permissionPrompt.querySelector('i').style.display = 'none'; // مخفی کردن "در حال بارگذاری"
        console.log("Ready to start. Mode:", currentGameMode);
    } else {
         startButton.disabled = true;
         startButton.textContent = handLandmarker ? "حالت بازی انتخاب نشده" : "لطفاً صبر کنید...";
         if(handLandmarker) permissionPrompt.querySelector('i').style.display = 'none';
    }
}

// --- تابع جدید: انتخاب حالت بازی ---
function selectGameMode(event) {
    currentGameMode = event.target.dataset.mode;
    console.log("Game mode selected:", currentGameMode);

    // نمایش نام حالت انتخاب شده در پیام اجازه
    selectedModeInfo.textContent = gameModeNames[currentGameMode] || 'انتخاب شده';
    permissionTitle.textContent = `بازی ${gameModeNames[currentGameMode] || ''}`;


    // مخفی کردن بخش انتخاب حالت و نمایش بخش اجازه
    modeSelectionDiv.classList.remove('active');
    modeSelectionDiv.classList.add('hidden');
    permissionPrompt.classList.remove('hidden');
    permissionPrompt.classList.add('active');

    // بررسی مجدد آمادگی برای فعال کردن دکمه شروع
    checkIfReadyToEnableStart();
}


// --- درخواست دسترسی به دوربین و شروع (تقریبا مثل قبل) ---
async function startCameraAndGame() {
    // ... (بخش چک کردن handLandmarker و errorMessage مثل قبل) ...
    if (!handLandmarker || !currentGameMode) {
        errorMessage.textContent = !handLandmarker ? "مدل تشخیص دست آماده نیست." : "حالت بازی انتخاب نشده.";
        return;
    }
     errorMessage.textContent = '';
     startButton.disabled = true;
     startButton.textContent = "در حال اتصال...";

    try {
        if (stream) { stream.getTracks().forEach(track => track.stop()); }
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        videoElement.srcObject = stream;

        videoElement.onloadeddata = () => {
             canvasElement.width = videoElement.videoWidth;
             canvasElement.height = videoElement.videoHeight;

            // مخفی کردن پیام اجازه و نمایش هدر، محتوای بازی و فوتر
            permissionPrompt.classList.remove('active');
            permissionPrompt.classList.add('hidden');
            mainHeader.classList.remove('hidden'); // نمایش هدر
            mainHeader.classList.add('active');
            gameContent.classList.remove('hidden'); // نمایش محتوای بازی
            gameContent.classList.add('active');
            mainFooter.classList.remove('hidden'); // نمایش فوتر
            mainFooter.classList.add('active');

            gameActive = true;
            interactionAllowed = true;

             if (animationFrameId) cancelAnimationFrame(animationFrameId);
             predictWebcam(); // شروع حلقه پردازش

            console.log("Game activated. Mode:", currentGameMode);
            generateQuestion(); // نمایش اولین سوال بر اساس حالت

             startButton.textContent = "شروع و اجازه دسترسی"; // بازگرداندن متن دکمه
        };
        videoElement.play().catch(playError => { /* ... (مدیریت خطای play مثل قبل) ... */ });

    } catch (error) {
        // ... (مدیریت خطای دوربین مثل قبل، فقط نمایش دوباره permission prompt) ...
        errorMessage.textContent = "خطا در دسترسی به دوربین: " + error.message; // نمایش پیام خطا
        permissionPrompt.classList.add('active');
        permissionPrompt.classList.remove('hidden');
        // مخفی کردن بقیه چیزها اگر نمایش داده شده بودند
        mainHeader.classList.add('hidden');
        mainHeader.classList.remove('active');
        gameContent.classList.add('hidden');
        gameContent.classList.remove('active');
        mainFooter.classList.add('hidden');
        mainFooter.classList.remove('active');
        gameActive = false;
        startButton.disabled = false;
        startButton.textContent = "شروع و اجازه دسترسی";
    }
}

// --- حلقه پردازش ویدیو (predictWebcam - مثل قبل) ---
async function predictWebcam() {
    if (!gameActive || !handLandmarker || videoElement.readyState < videoElement.HAVE_METADATA) {
        if(gameActive) animationFrameId = requestAnimationFrame(predictWebcam);
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
         catch (sendError){ console.error("Error sending frame:", sendError); }
    }
    animationFrameId = requestAnimationFrame(predictWebcam);
}


// --- پردازش نتایج MediaPipe ( *** با اصلاح برخورد آینه *** ) ---
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    let indexFingerTipPixel = null;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && gameActive) {
        const landmarks = results.multiHandLandmarks[0];
        const fingerTipNormalized = landmarks[8]; // نوک انگشت اشاره

        if (fingerTipNormalized && typeof fingerTipNormalized.x === 'number') {
            // محاسبه مختصات نقطه زرد (بصری) - این درست است
            const tipX = fingerTipNormalized.x * canvasElement.width;
            const tipY = fingerTipNormalized.y * canvasElement.height;
            indexFingerTipPixel = { x: tipX, y: tipY };

            // رسم نقطه زرد (بصری)
            canvasCtx.beginPath();
            canvasCtx.arc(tipX, tipY, 8, 0, 2 * Math.PI);
            canvasCtx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            canvasCtx.fill();
        }
    }
    canvasCtx.restore();

    // --- منطق Hover و انتخاب (فقط اگر تعامل مجاز است) ---
    if (gameActive && interactionAllowed) {
        let sectionFound = null;
        if (indexFingerTipPixel) {
             const videoRect = videoElement.getBoundingClientRect();
             const scaleX = videoRect.width / videoElement.videoWidth;
             const scaleY = videoRect.height / videoElement.videoHeight;

             // <<< --- اصلاح کلیدی برای برخورد --- >>>
             // برای برخورد، از مختصات X آینه شده استفاده می‌کنیم
             // چون چیدمان باکس‌ها آینه نشده ولی مختصات انگشت از تصویر آینه نشده می‌آید.
             // indexFingerTipPixel.x الان مختصات روی کانواس آینه شده است.
             // ما نیاز به مختصاتی داریم که انگار روی صفحه آینه نشده کلیک می‌کنیم.
             const nonMirrored_tipX_on_canvas = canvasElement.width - indexFingerTipPixel.x;

             // حالا این مختصات غیرآینه شده را به مختصات صفحه تبدیل می‌کنیم
             const collisionScreenX = videoRect.left + nonMirrored_tipX_on_canvas * scaleX;
             const collisionScreenY = videoRect.top + indexFingerTipPixel.y * scaleY; // Y آینه نمی‌شود


            // بررسی برخورد با استفاده از مختصات محاسبه شده برای برخورد
            answerSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (collisionScreenX >= rect.left && collisionScreenX <= rect.right &&
                    collisionScreenY >= rect.top && collisionScreenY <= rect.bottom) {
                    sectionFound = section;
                }
            });
        }
        // به‌روزرسانی وضعیت Hover بر اساس بخش پیدا شده
        updateHoverState(sectionFound);
    } else if (!interactionAllowed && currentHoverSection) {
        updateHoverState(null); // پاک کردن هاور اگر تعامل غیرفعال شد
    }
}

// --- مدیریت وضعیت Hover و تایمر (updateHoverState - مثل قبل) ---
function updateHoverState(sectionCurrentlyHovered) {
    // ... (کد کامل این تابع دقیقا مثل نسخه قبلی است) ...
    // (فقط مطمئن شوید از interactionAllowed به درستی استفاده می‌کند)
    if (sectionCurrentlyHovered === currentHoverSection) {
        if (currentHoverSection && hoverStartTime && interactionAllowed) {
            const elapsedTime = Date.now() - hoverStartTime;
            const progress = Math.min(100, (elapsedTime / HOVER_DURATION_MS) * 100);
            const progressBar = currentHoverSection.querySelector('.hover-progress');
            if (progressBar) progressBar.style.width = `${progress}%`;
        }
        return;
    }
    clearTimeout(hoverTimeoutId);
    hoverTimeoutId = null;
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
             progressBar = document.createElement('div');
             progressBar.className = 'hover-progress';
             currentHoverSection.appendChild(progressBar);
         }
        progressBar.style.width = '0%';
        hoverTimeoutId = setTimeout(() => {
            if (currentHoverSection === sectionCurrentlyHovered && interactionAllowed) {
                 console.log("Selection triggered:", currentHoverSection.querySelector('.answer-number').textContent);
                 interactionAllowed = false;
                 checkAnswer(currentHoverSection);
                 // ریست وضعیت هاور در checkAnswer انجام می‌شود
            }
        }, HOVER_DURATION_MS);
    } else {
        hoverStartTime = null;
    }
}


// --- تولید سوال ( *** بازنویسی کامل بر اساس حالت بازی *** ) ---
function generateQuestion() {
    console.log(`Generating question for mode: ${currentGameMode}`);
    let num1, num2, correctAnswer, operatorSymbol;

    switch (currentGameMode) {
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
            num1 = Math.floor(Math.random() * 80) + 20; // 20-99
            num2 = Math.floor(Math.random() * (num1 - 10)) + 10; // 10 تا یکی کمتر از num1
            correctAnswer = num1 - num2;
            operatorSymbol = '-';
            break;
        case 'divide':
            // برای تقسیم، جواب و مقسوم‌علیه را اول می‌سازیم
            const result = Math.floor(Math.random() * 11) + 2; // جواب 2 تا 12
            num2 = Math.floor(Math.random() * 9) + 2;  // مقسوم علیه 2 تا 10
            num1 = result * num2; // مقسوم
            correctAnswer = result;
            operatorSymbol = '÷';
            break;
        case 'multiply':
        default: // حالت پیش‌فرض ضرب باشد
            num1 = Math.floor(Math.random() * 10) + 1; // 1-10
            num2 = Math.floor(Math.random() * 10) + 1; // 1-10
            correctAnswer = num1 * num2;
            operatorSymbol = '×';
            break;
    }

    currentCorrectAnswer = correctAnswer; // ذخیره جواب صحیح برای بررسی

    // نمایش سوال در DOM
    operand1Span.textContent = num1;
    operatorSpan.textContent = operatorSymbol;
    operand2Span.textContent = num2;
    resultPlaceholderSpan.textContent = '?';

    // تولید گزینه‌های جواب (یک درست، سه غلط)
    const options = [correctAnswer];
    while (options.length < 4) {
        let wrongAnswer;
        // تولید جواب غلط کمی هوشمندتر
        const range = Math.abs(correctAnswer) > 50 ? 20 : 10; // بازه انحراف
        const offset = Math.floor(Math.random() * range) + 1;
        // احتمال بیشتر برای جواب‌های نزدیک، کمی هم جواب‌های دورتر
        if (Math.random() < 0.7) {
            wrongAnswer = correctAnswer + offset * (Math.random() < 0.5 ? 1 : -1);
        } else {
             // جواب کاملا پرت (ولی در محدوده منطقی)
             wrongAnswer = Math.max(1, correctAnswer + (Math.floor(Math.random() * 40) - 20));
        }

        // اطمینان از عدم تکرار و متفاوت بودن با جواب صحیح
        if (!options.includes(wrongAnswer) && wrongAnswer !== correctAnswer && wrongAnswer > 0) { // جواب‌های منفی فعلا نه
            options.push(wrongAnswer);
        }
    }

    shuffleArray(options); // به هم ریختن گزینه‌ها

    // نمایش گزینه‌ها در بخش‌های جواب
    answerSections.forEach((section, index) => {
        const numberSpan = section.querySelector('.answer-number');
        numberSpan.textContent = options[index];
        section.classList.remove('shake');
        const progressBar = section.querySelector('.hover-progress');
        if (progressBar) progressBar.style.width = '0%';
    });

     // اجازه تعامل برای سوال جدید
     setTimeout(() => {
        interactionAllowed = true;
        console.log("Interaction enabled for new question.");
     }, 200);

     console.log(`Question: ${num1} ${operatorSymbol} ${num2} = ? (Answer: ${correctAnswer}) Options: [${options.join(', ')}]`);
}

// --- بررسی جواب (checkAnswer - تقریبا مثل قبل) ---
function checkAnswer(selectedSection) {
    if (!selectedSection || !gameActive) {
        interactionAllowed = true; // باز کردن تعامل در صورت خطای فراخوانی
        return;
    }
    // interactionAllowed اینجا false شده توسط updateHoverState

    const selectedNumber = parseInt(selectedSection.querySelector('.answer-number').textContent);
    console.log(`Checking answer: Selected ${selectedNumber}, Correct: ${currentCorrectAnswer}`);

     // ریست کردن وضعیت هاور بلافاصله
     if (currentHoverSection) {
         currentHoverSection.classList.remove('hand-hover');
         const progressBar = currentHoverSection.querySelector('.hover-progress');
         if (progressBar) progressBar.style.width = '0%';
         currentHoverSection = null;
     }
     hoverStartTime = null;
     clearTimeout(hoverTimeoutId);
     hoverTimeoutId = null;

    if (selectedNumber === currentCorrectAnswer) {
        displayFeedback("عالی! درست بود!", "correct");
        setTimeout(() => {
             generateQuestion(); // generateQuestion خودش interactionAllowed را فعال می‌کند
        }, 1000);
    } else {
        displayFeedback("اشتباه بود!", "incorrect");
        // لرزش (بدون نیاز به چک کردن هاور، چون هاور همین الان پاک شد)
        selectedSection.classList.add('shake');
        setTimeout(() => {
            selectedSection.classList.remove('shake');
             // اجازه تلاش مجدد بعد از نمایش خطا و پایان لرزش
             interactionAllowed = true;
             console.log("Interaction enabled after incorrect answer feedback.");
        }, 500);
    }
}

// --- راه‌اندازی اولیه ---

// 1. اضافه کردن Event Listener به دکمه‌های انتخاب حالت
modeButtons.forEach(button => {
    button.addEventListener('click', selectGameMode);
});

// 2. شروع بارگذاری MediaPipe
setupMediaPipe();

// 3. اضافه کردن Event Listener به دکمه شروع اصلی
startButton.addEventListener('click', startCameraAndGame);

// 4. مدیریت توقف بازی هنگام بستن صفحه (مثل قبل)
window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameActive = false;
});

console.log("Game script initialized. Waiting for mode selection and MediaPipe setup.");