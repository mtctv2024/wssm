document.addEventListener('DOMContentLoaded', function() {
    
    // --- تعريفات العناصر ---
    const imageInput = document.getElementById('imageInput');
    const logoInput = document.getElementById('logoInput');
    const templateInput = document.getElementById('templateInput');
    const imageCountLabel = document.getElementById('imageCountLabel');
    const logoStatusLabel = document.getElementById('logoStatusLabel');
    const templateStatusLabel = document.getElementById('templateStatusLabel');
    const logoSizeSlider = document.getElementById('logoSize');
    const logoOpacitySlider = document.getElementById('logoOpacity');
    const templateOpacitySlider = document.getElementById('templateOpacity');
    const logoPositionSelect = document.getElementById('logoPosition');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewArea = document.getElementById('previewArea');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const processButton = document.getElementById('processButton');
    const resetButton = document.getElementById('resetButton');
    const progressBar = document.getElementById('progressBar');
    const progressLabel = document.getElementById('progressLabel');
    const postProcessModal = document.getElementById('post-process-modal');
    const progressContainer = document.getElementById('progress-container');
    const postProcessMessage = document.getElementById('post-process-message');
    const btnKeepSettings = document.getElementById('btn-keep-settings');
    const btnResetAfterProcess = document.getElementById('btn-reset-after-process');
    const btnResetLogo = document.getElementById('btn-reset-logo');
    const btnResetTemplate = document.getElementById('btn-reset-template');
    const infoOverlay = document.querySelector('.info-overlay');

    // --- متغيرات الحالة ---
    let imageFiles = [];
    let preloadedLogo = null;
    let preloadedTemplate = null;
    let preloadedBaseImage = null;

    // --- منطق التبويبات ---
    window.openTab = function(evt, tabName) {
        let i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
        tablinks = document.getElementsByClassName("tab-link");
        for (i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", ""); }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }

    // --- محرك الرسم للمعاينة ---
    window.updateLivePreview = function() {
        if (!preloadedBaseImage) {
            previewCanvas.style.display = 'none';
            previewPlaceholder.style.display = 'block';
            return;
        }
        previewCanvas.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        
        const ctx = previewCanvas.getContext('2d');
        const containerWidth = previewArea.clientWidth;
        const containerHeight = previewArea.clientHeight;

        previewCanvas.width = containerWidth;
        previewCanvas.height = containerHeight;
        
        let imageToDraw = preloadedBaseImage;
        let targetWidth = imageToDraw.width;
        let targetHeight = imageToDraw.height;
        
        const imageSizeMode = document.querySelector('input[name="imageSizeMode"]:checked').value;
        if(imageSizeMode === 'fit_to_template' && preloadedTemplate) {
            targetWidth = preloadedTemplate.width;
            targetHeight = preloadedTemplate.height;
        }

        const scale = Math.min(containerWidth / targetWidth, containerHeight / targetHeight);
        const drawWidth = targetWidth * scale;
        const drawHeight = targetHeight * scale;
        const x = (containerWidth - drawWidth) / 2;
        const y = (containerHeight - drawHeight) / 2;
        
        ctx.clearRect(0, 0, containerWidth, containerHeight);
        ctx.drawImage(imageToDraw, x, y, drawWidth, drawHeight);

        if(preloadedTemplate) {
            ctx.globalAlpha = templateOpacitySlider.value / 100;
            ctx.drawImage(preloadedTemplate, x, y, drawWidth, drawHeight);
            ctx.globalAlpha = 1.0;
        }
        
        if (preloadedLogo) {
            const logoScale = logoSizeSlider.value / 100;
            const logoRatio = preloadedLogo.width / preloadedLogo.height;
            const new_w = drawWidth * logoScale;
            const new_h = new_w / logoRatio;
            const margin = 10;
            
            const positions = {
                "Top-Left": [x + margin, y + margin],
                "Top-Right": [x + drawWidth - new_w - margin, y + margin],
                "Bottom-Left": [x + margin, y + drawHeight - new_h - margin],
                "Bottom-Right": [x + drawWidth - new_w - margin, y + drawHeight - new_h - margin],
                "Center": [x + (drawWidth - new_w) / 2, y + (drawHeight - new_h) / 2],
            };
            const [logoX, logoY] = positions[logoPositionSelect.value];
            
            ctx.globalAlpha = logoOpacitySlider.value / 100;
            ctx.drawImage(preloadedLogo, logoX, logoY, new_w, new_h);
            ctx.globalAlpha = 1.0;
        }
    }

    // --- محرك الرسم للمعالجة النهائية ---
    function drawOnCanvasForProcessing(canvas, baseImage, callback) {
        const imageSizeMode = document.querySelector('input[name="imageSizeMode"]:checked').value;
        let targetWidth = baseImage.width;
        let targetHeight = baseImage.height;

        if (imageSizeMode === 'fit_to_template' && preloadedTemplate) {
            targetWidth = preloadedTemplate.width;
            targetHeight = preloadedTemplate.height;
        }
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(baseImage, 0, 0, targetWidth, targetHeight);
        
        if (preloadedTemplate) {
            ctx.globalAlpha = templateOpacitySlider.value / 100;
            ctx.drawImage(preloadedTemplate, 0, 0, targetWidth, targetHeight);
            ctx.globalAlpha = 1.0;
        }
        if (preloadedLogo) {
            const logoSettings = { size_percent: logoSizeSlider.value, opacity: logoOpacitySlider.value, position: logoPositionSelect.value };
            const scale = logoSettings.size_percent / 100;
            const new_w = canvas.width * scale;
            const new_h = preloadedLogo.height * (new_w / preloadedLogo.width);
            const margin = 25;
            const positions = {
                "Top-Left": [margin, margin], "Top-Right": [canvas.width - new_w - margin, margin],
                "Bottom-Left": [margin, canvas.height - new_h - margin], "Bottom-Right": [canvas.width - new_w - margin, canvas.height - new_h - margin],
                "Center": [(canvas.width - new_w) / 2, (canvas.height - new_h) / 2]
            };
            const [x, y] = positions[logoSettings.position];
            ctx.globalAlpha = logoSettings.opacity / 100;
            ctx.drawImage(preloadedLogo, x, y, new_w, new_h);
            ctx.globalAlpha = 1.0;
        }
        callback(canvas);
    }
    
    // --- وظيفة بدء المعالجة ---
    async function startProcessing() {
        if (imageFiles.length === 0) { alert("الرجاء اختيار مجموعة صور أولاً."); return; }
        processButton.disabled = true;
        if(progressContainer) progressContainer.style.display = 'block';
        if(postProcessMessage) postProcessMessage.style.display = 'none';
        if(progressBar) progressBar.value = 0;
        if(progressLabel) progressLabel.textContent = "0%";
        postProcessModal.style.display = 'flex';
        
        const tempCanvas = document.createElement('canvas');
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const baseImage = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => { const img = new Image(); img.onload = () => resolve(img); img.src = e.target.result; };
                reader.readAsDataURL(file);
            });
            drawOnCanvasForProcessing(tempCanvas, baseImage, (canvas) => {
                const link = document.createElement('a');
                const fileName = file.name.split('.').slice(0, -1).join('.');
                link.download = `${fileName}_processed.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.95);
                link.click();
            });
            const progress = ((i + 1) / imageFiles.length) * 100;
            if(progressBar) progressBar.value = progress;
            if(progressLabel) progressLabel.textContent = `${Math.round(progress)}%`;
        }
        processButton.disabled = false;
        if(progressContainer) progressContainer.style.display = 'none';
        if(postProcessMessage) postProcessMessage.style.display = 'block';
    }
    
    // --- باقي الوظائف ---
    function saveSettings(){const settings={logoSize:logoSizeSlider.value,logoOpacity:logoOpacitySlider.value,logoPosition:logoPositionSelect.value,templateOpacity:templateOpacitySlider.value,imageSizeMode:document.querySelector('input[name="imageSizeMode"]:checked').value};localStorage.setItem("rakaz_app_settings",JSON.stringify(settings))}
    function loadSettings(){const savedSettings=localStorage.getItem("rakaz_app_settings");if(savedSettings){const settings=JSON.parse(savedSettings);logoSizeSlider.value=settings.logoSize,logoOpacitySlider.value=settings.logoOpacity,logoPositionSelect.value=settings.logoPosition,templateOpacitySlider.value=settings.templateOpacity,document.querySelector(`input[name="imageSizeMode"][value="${settings.imageSizeMode}"]`).checked=!0,document.getElementById("logoSizeValue").textContent=settings.logoSize,document.getElementById("logoOpacityValue").textContent=settings.logoOpacity,document.getElementById("templateOpacityValue").textContent=settings.templateOpacity}}
    function resetLogo() { preloadedLogo = null; logoInput.value = ""; logoStatusLabel.textContent = 'لا يوجد شعار'; updateLivePreview(); }
    function resetTemplate() { preloadedTemplate = null; templateInput.value = ""; templateStatusLabel.textContent = 'لا يوجد قالب'; updateLivePreview(); }
    function resetAll(){imageFiles=[],imageInput.value="",imageCountLabel.textContent="0 صورة",preloadedBaseImage=null,resetLogo(),resetTemplate(),logoSizeSlider.value=15,logoOpacitySlider.value=100,logoPositionSelect.value="Bottom-Right",templateOpacitySlider.value=100,document.querySelector('input[name="imageSizeMode"][value="fit_to_template"]').checked=!0,document.getElementById("logoSizeValue").textContent=15,document.getElementById("logoOpacityValue").textContent=100,document.getElementById("templateOpacityValue").textContent=100,progressBar.value=0,progressLabel.textContent="0%",localStorage.removeItem("rakaz_app_settings"),updateLivePreview(),alert("تمت إعادة ضبط التطبيق إلى الإعدادات الافتراضية.")}
    
    // --- روابط الأحداث ---
    imageInput.addEventListener('change',(e)=>{imageFiles=Array.from(e.target.files),imageCountLabel.textContent=`${imageFiles.length} صورة`,imageFiles.length>0?(preloadedBaseImage=null,updateLivePreview(),(()=>{const e=new FileReader;e.onload=(e=>{preloadedBaseImage=new Image,preloadedBaseImage.onload=updateLivePreview,preloadedBaseImage.src=e.target.result}),e.readAsDataURL(imageFiles[0])})()):(preloadedBaseImage=null,updateLivePreview())});
    logoInput.addEventListener('change',(e)=>{logoFile=e.target.files[0],logoStatusLabel.textContent=logoFile?"✔ تم اختيار الشعار":"لا يوجد شعار",logoFile?(preloadedLogo=null,updateLivePreview(),(()=>{const e=new FileReader;e.onload=(e=>{preloadedLogo=new Image,preloadedLogo.onload=updateLivePreview,preloadedLogo.src=e.target.result}),e.readAsDataURL(logoFile)})()):(preloadedLogo=null,updateLivePreview())});
    templateInput.addEventListener('change',(e)=>{templateFile=e.target.files[0],templateStatusLabel.textContent=templateFile?"✔ تم اختيار القالب":"لا يوجد قالب",templateFile?(preloadedTemplate=null,updateLivePreview(),(()=>{const e=new FileReader;e.onload=(e=>{preloadedTemplate=new Image,preloadedTemplate.onload=updateLivePreview,preloadedTemplate.src=e.target.result}),e.readAsDataURL(templateFile)})()):(preloadedTemplate=null,updateLivePreview())});
    document.querySelectorAll('input[type="range"], select, input[type="radio"]').forEach((e=>{e.addEventListener("input",(()=>{if("range"===e.type){const t=document.getElementById(e.id+"Value");t&&(t.textContent=e.value)}updateLivePreview(),saveSettings()}))}));
    processButton.addEventListener('click',startProcessing);
    resetButton.addEventListener('click',resetAll);
    if(btnResetLogo) btnResetLogo.addEventListener('click', resetLogo);
    if(btnResetTemplate) btnResetTemplate.addEventListener('click', resetTemplate);
    btnKeepSettings.addEventListener('click',(()=>{postProcessModal.style.display="none"}));
    btnResetAfterProcess.addEventListener('click',(()=>{resetAll(),postProcessModal.style.display="none"}));
    window.addEventListener("resize",updateLivePreview);
    
    // --- منطق شاشة البداية ---
    const splashScreen=document.getElementById("splash-screen");
    const mainContainer = document.querySelector(".main-container");
    setTimeout((()=>{splashScreen.style.opacity="0"}),2000);
    setTimeout((()=>{
        splashScreen.style.display="none";
        mainContainer.style.display="flex";
        if(infoOverlay) infoOverlay.style.display = 'block';
        updateLivePreview();
    }),2500);
    loadSettings();
});
