let currentScreen = 1;

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

function showScreen(id){

    document
    .querySelectorAll(".screen")
    .forEach(screen=>{

        screen.classList.remove(
            "active"
        );
    });

    document
    .getElementById(
        "screen" + id
    )
    .classList.add(
        "active"
    );
}

function showErrorInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.add("error-border", "shake");
    setTimeout(() => {
        input.classList.remove("shake");
    }, 400);
    input.addEventListener("input", function removeError() {
        input.classList.remove("error-border");
        input.removeEventListener("input", removeError);
    });
}

async function registerUser(){
    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const errorEl = document.getElementById("registerError");
    const terms = document.getElementById("terms").checked;
    const privacy = document.getElementById("privacy").checked;
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    errorEl.classList.remove("show");

    let hasError = false;

    if (!name) { showErrorInput("registerName"); hasError = true; }
    if (!email) { showErrorInput("registerEmail"); hasError = true; }
    if (!password) { showErrorInput("registerPassword"); hasError = true; }

    if (hasError) {
        errorEl.innerText = "Todos los campos son requeridos.";
        errorEl.classList.add("show");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showErrorInput("registerEmail");
        errorEl.innerText = "auth/invalid-email: Por favor ingresa un correo electrónico válido.";
        errorEl.classList.add("show");
        return;
    }

    if (password.length < 6) {
        showErrorInput("registerPassword");
        errorEl.innerText = "auth/weak-password: La contraseña debe tener al menos 6 caracteres.";
        errorEl.classList.add("show");
        return;
    }

    if (!terms || !privacy) {
        errorEl.innerText = "Debes aceptar los Términos y Políticas de Privacidad.";
        errorEl.classList.add("show");
        return;
    }

    try {
        // Firebase Flow (Simulado para que no rompa si no tienen firebase SDK aun)
        // Ejemplo Real: const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        }).catch(() => null); // Simulando red o ignorando si no hay backend

        // Simulación de éxito si usan el boton real:
        localStorage.setItem("citaciudadanaUser", JSON.stringify({ name, email, uid: "firebase_user_" + Date.now() }));
        showScreen(7); // Cuenta Creada exitosamente

    } catch (error) {
        console.error("Error Firebase:", error);
        if (error.code === 'auth/email-already-in-use') {
            showErrorInput("registerEmail");
            errorEl.innerText = "auth/email-already-in-use: Este correo ya está registrado.";
        } else {
            errorEl.innerText = "Error al crear cuenta en Firebase.";
        }
        errorEl.classList.add("show");
    }
}

async function loginUser(){
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const errorEl = document.getElementById("loginError");
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    errorEl.classList.remove("show");

    let hasError = false;

    if (!email) { showErrorInput("loginEmail"); hasError = true; }
    if (!password) { showErrorInput("loginPassword"); hasError = true; }

    if (hasError) {
        errorEl.innerText = "auth/missing-credentials: Por favor, ingresa tu correo y contraseña.";
        errorEl.classList.add("show");
        return;
    }

    try {
        // Firebase Flow (Simulado)
        // Ejemplo Real: const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Simulación estricta de validación para UX:
        if (password !== "123456" && password !== "1234") {
            // Simulamos un error de password incorrecto
            throw { code: 'auth/wrong-password', message: 'Contraseña incorrecta' };
        }
        if (email !== "prueba@app.com" && !email.includes("@")) {
            throw { code: 'auth/user-not-found', message: 'Usuario no encontrado' };
        }

        // Si pasa, simula login exitoso:
        localStorage.setItem("citaciudadanaUser", JSON.stringify({ name: "Demo User", email: email, uid: "12345" }));
        updateAppointmentCards();
        document.getElementById("userNameDisplay").innerText = "Demo User";
        document.getElementById("agendarNameDisplay").innerText = "Demo User";
        showScreen(8); // Menu
        
    } catch (error) {
        console.error("Error Firebase:", error);
        if (error.code === 'auth/wrong-password') {
            showErrorInput("loginPassword");
            errorEl.innerText = "auth/wrong-password: La contraseña que ingresaste es incorrecta.";
        } else if (error.code === 'auth/user-not-found') {
            showErrorInput("loginEmail");
            errorEl.innerText = "auth/user-not-found: No existe una cuenta con este correo.";
        } else {
            errorEl.innerText = error.message || "Error al iniciar sesión.";
        }
        errorEl.classList.add("show");
    }
}

async function goToMenu(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) {
        showScreen(4);
        return;
    }

    document.getElementById("userNameDisplay").innerText = user.name;
    const agendarDisplay = document.getElementById("agendarNameDisplay");
    if (agendarDisplay) agendarDisplay.innerText = user.name;

    try {
        const response = await fetch(`/api/appointments?email=${encodeURIComponent(user.email)}`);
        const appointments = await response.json();
        localStorage.setItem("appointments", JSON.stringify(appointments));
    } catch (error) {
        console.error("Error al obtener citas:", error);
    }

    updateAppointmentCards();
    showScreen(8);
}

async function saveAppointment(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) {
        showToast("Debes iniciar sesión primero");
        showScreen(4);
        return;
    }

    const speciality = document.getElementById("speciality").value;
    const date = document.getElementById("appointmentDate").value;
    const time = document.getElementById("appointmentTime").value;

    if (!date) {
        showToast("Selecciona una fecha");
        return;
    }

    try {
        const response = await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, speciality, date, time })
        });
        const result = await response.json();

        if (result.success) {
            showScreen(16);
        } else {
            showToast(result.message || "Error al guardar cita");
        }
    } catch (error) {
        console.error("Error al guardar cita:", error);
        showToast("Error de conexión con el servidor");
    }
}

function updateAppointmentCards(){
    const appointments = JSON.parse(localStorage.getItem("appointments")) || [];
    const nextDate = document.getElementById("nextDateMenu");
    const nextDesc = document.getElementById("nextAppointmentMenu");

    if (!nextDate || !nextDesc) return;

    if (appointments.length === 0) {
        nextDesc.innerText = "Sin citas agendadas";
        return;
    }

    nextDate.innerText = appointments[0].date;
    nextDesc.innerText = appointments[0].speciality;
}

function loadProfile(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) return;

    // Vista Perfil
    const vName = document.getElementById("viewName");
    if(vName) vName.value = user.name || "";
    const vEmail = document.getElementById("viewEmail");
    if(vEmail) vEmail.value = user.email || "";
    const vPhone = document.getElementById("viewPhone");
    if(vPhone) vPhone.value = user.phone || "";
    const vAge = document.getElementById("viewAge");
    if(vAge) vAge.value = user.age || "";
    const vCurp = document.getElementById("viewCurp");
    if(vCurp) vCurp.value = user.curp || "";
    const vSocial = document.getElementById("viewSocial");
    if(vSocial) vSocial.value = user.social || "";

    // Actualizar Perfil
    const eName = document.getElementById("editName");
    if(eName) eName.value = user.name || "";
    const eEmail = document.getElementById("editEmail");
    if(eEmail) eEmail.value = user.email || "";
    const ePhone = document.getElementById("editPhone");
    if(ePhone) ePhone.value = user.phone || "";
    const eAge = document.getElementById("editAge");
    if(eAge) eAge.value = user.age || "";
    const eCurp = document.getElementById("editCurp");
    if(eCurp) eCurp.value = user.curp || "";
    const eSocial = document.getElementById("editSocial");
    if(eSocial) eSocial.value = user.social || "";

    if (user.profileImage) {
        const img = document.getElementById("profileImage");
        if(img) img.src = user.profileImage;
    }

    showScreen(9);
}

async function saveProfile(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) return;

    const name = document.getElementById("editName").value.trim();
    const phone = document.getElementById("editPhone").value.trim();
    const age = document.getElementById("editAge").value.trim();
    const curp = document.getElementById("editCurp").value.trim();
    const social = document.getElementById("editSocial").value.trim();
    
    // Validating password confirmation
    const confirmPasswordInput = document.getElementById("editConfirmPassword");
    if(confirmPasswordInput) {
        const confirmPassword = confirmPasswordInput.value;
        if (!confirmPassword) {
            showErrorInput("editConfirmPassword");
            showToast("Debes confirmar tu contraseña para guardar los cambios.");
            return;
        }
        if (confirmPassword !== "123456" && confirmPassword !== "1234") { // Simulación
            showErrorInput("editConfirmPassword");
            showToast("auth/wrong-password: La contraseña es incorrecta.");
            return;
        }
    }

    try {
        // Firebase Flow (Simulado)
        // const auth = getAuth();
        // const credential = EmailAuthProvider.credential(user.email, confirmPassword);
        // await reauthenticateWithCredential(auth.currentUser, credential);
        // await updateProfile(auth.currentUser, { displayName: name });
        // const userRef = doc(db, "users", user.uid);
        // await setDoc(userRef, { age, phone, curp, social }, { merge: true });

        // Simulación de éxito:
        const result = { success: true, user: { ...user, name, phone, age, curp, social } };

        if (result.success) {
            localStorage.setItem("citaciudadanaUser", JSON.stringify(result.user));
            showToast("Perfil actualizado");
            if(confirmPasswordInput) confirmPasswordInput.value = ""; // clear
            
            // Update the view fields dynamically
            const vName = document.getElementById("viewName");
            if(vName) vName.value = name;
            const vAge = document.getElementById("viewAge");
            if(vAge) vAge.value = age;
            const vPhone = document.getElementById("viewPhone");
            if(vPhone) vPhone.value = phone;
            const vCurp = document.getElementById("viewCurp");
            if(vCurp) vCurp.value = curp;
            const vSocial = document.getElementById("viewSocial");
            if(vSocial) vSocial.value = social;

            showScreen(9); // Regresar a pantalla de Perfil
        }
    } catch (error) {
        console.error("Error Firebase:", error);
        showToast("Error al actualizar perfil en Firebase.");
    }
}

async function analyzeSymptoms(){
    const input = document.getElementById("symptomInput");
    const text = input.value.trim();

    if (text === "") return;

    addUserMessage(text);
    input.value = "";

    const botMsgId = "loading-bot-msg-" + Date.now();
    const chatContainer = document.getElementById("chatContainer");
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "bot-message";
    loadingDiv.id = botMsgId;
    loadingDiv.innerText = "Analizando síntomas...";
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const response = await fetch("/api/analyze-symptoms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });
        const result = await response.json();

        const loadingElement = document.getElementById(botMsgId);
        if (loadingElement) loadingElement.remove();

        if (result.success) {
            addBotMessage(result.response);
        } else {
            addBotMessage("No pudimos analizar tus síntomas. Inténtalo de nuevo.");
        }
    } catch (error) {
        console.error("Error al analizar síntomas:", error);
        const loadingElement = document.getElementById(botMsgId);
        if (loadingElement) loadingElement.remove();
        addBotMessage("Lo siento, no he podido conectarme con el servidor de diagnóstico en este momento.");
    }
}

function addUserMessage(msg){

    const div=
    document.createElement(
        "div"
    );

    div.className=
    "user-message";

    div.innerText=msg;

    document
    .getElementById(
        "chatContainer"
    )
    .appendChild(div);
}

function addBotMessage(msg){

    const div=
    document.createElement(
        "div"
    );

    div.className=
    "bot-message";

    div.innerText=msg;

    document
    .getElementById(
        "chatContainer"
    )
    .appendChild(div);
}

function toggleMenu(){

    document
    .getElementById(
        "sideMenu"
    )
    .classList.toggle(
        "active"
    );
}

function toggleTheme(){

    document.body
    .classList.toggle(
        "dark-theme"
    );
}

function showToast(message){

    const toast=
    document.getElementById(
        "toast"
    );

    toast.innerText=
    message;

    toast.classList.add(
        "show-toast"
    );

    setTimeout(()=>{

        toast.classList.remove(
            "show-toast"
        );

    },2500);
}

function changePhoto(event){

    const file=
    event.target.files[0];

    if(!file) return;

    const reader=
    new FileReader();

    reader.onload=function(e){

        document
        .getElementById(
            "profileImage"
        )
        .src=
        e.target.result;

        localStorage.setItem(
            "profileImage",
            e.target.result
        );
    }

    reader.readAsDataURL(
        file
    );
}

window.onload=()=>{

    setTimeout(()=>{

        document
        .getElementById(
            "splashScreen"
        )
        .classList.add(
            "hideSplash"
        );

    },2000);
}

async function iniciarConGoogle() {
    showToast("Autenticando con Google...");
    
    // Aquí se integraría la respuesta real de la SDK de Google.
    // Por ahora enviamos datos simulados a la nueva API.
    try {
        const response = await fetch("/api/google-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: "demo.google@gmail.com", 
                name: "Usuario Google",
                googleId: "1234567890" 
            })
        });
        const result = await response.json();

        if (result.success) {
            localStorage.setItem("citaciudadanaUser", JSON.stringify(result.user));
            goToMenu();
        } else {
            showToast("Error en autenticación de Google");
        }
    } catch (error) {
        console.error("Error Google Login:", error);
        showToast("Error de conexión");
    }
}

function filterDoctors() {
    const term = document.getElementById("searchResultsInput").value.toLowerCase();
    document.querySelectorAll(".doctor-res-card").forEach(card => {
        const text = card.innerText.toLowerCase();
        const category = card.getAttribute("data-category").toLowerCase();
        if (text.includes(term) || category.includes(term) || term === "") {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

function activateMap() {
    const overlay = document.getElementById("mapOverlay");
    const iframe = document.getElementById("googleMapIframe");
    
    if (overlay) overlay.style.display = "none";
    if (iframe) {
        iframe.style.pointerEvents = "auto";
        iframe.src = "https://www.openstreetmap.org/export/embed.html?bbox=-99.2%2C19.3%2C-99.1%2C19.5&layer=mapnik";
    }
}