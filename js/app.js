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

async function registerUser(){
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !email || !password) {
        showToast("Todos los campos son requeridos");
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const result = await response.json();

        if (result.success) {
            localStorage.setItem("citaciudadanaUser", JSON.stringify({ name, email }));
            showScreen(7);
        } else {
            showToast(result.message || "Error al registrar usuario");
        }
    } catch (error) {
        console.error("Error al registrar:", error);
        showToast("Error de conexión con el servidor");
    }
}

async function loginUser(){
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        showToast("Correo y contraseña son requeridos");
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (result.success) {
            localStorage.setItem("citaciudadanaUser", JSON.stringify(result.user));
            goToMenu();
        } else {
            showToast(result.message || "Credenciales incorrectas");
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        showToast("Error de conexión con el servidor");
    }
}

async function goToMenu(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) {
        showScreen(4);
        return;
    }

    document.getElementById("userGreeting").innerText = "Hola " + user.name;

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
            showToast("Cita guardada");
            await goToMenu();
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
    const next = document.getElementById("nextAppointment");
    const history = document.getElementById("historyList");

    history.innerHTML = "";

    if (appointments.length === 0) {
        next.innerText = "Sin citas";
        return;
    }

    next.innerHTML =
        appointments[0].date +
        "<br>" +
        appointments[0].time +
        "<br>" +
        appointments[0].speciality;

    appointments.forEach(item => {
        const li = document.createElement("li");
        li.innerText = item.date + " " + item.time + " - " + item.speciality;
        history.appendChild(li);
    });
}

function loadProfile(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) return;

    document.getElementById("profileName").innerText = user.name;
    document.getElementById("profileEmail").innerText = user.email;

    if (user.profileImage) {
        document.getElementById("profileImage").src = user.profileImage;
    }

    showScreen(9);
}

function loadProfileEditor(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) return;

    document.getElementById("editName").value = user.name || "";
    document.getElementById("editEmail").value = user.email || "";
    document.getElementById("editPhone").value = user.phone || "";
    document.getElementById("editAddress").value = user.address || "";

    showScreen(10);
}

async function saveProfile(){
    const user = JSON.parse(localStorage.getItem("citaciudadanaUser"));
    if (!user) return;

    const name = document.getElementById("editName").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const phone = document.getElementById("editPhone").value.trim();
    const address = document.getElementById("editAddress").value.trim();
    const profileImage = document.getElementById("profileImage").src;

    try {
        const response = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, name, phone, address, profileImage })
        });
        const result = await response.json();

        if (result.success) {
            localStorage.setItem("citaciudadanaUser", JSON.stringify(result.user));
            showToast("Perfil actualizado");
            loadProfile();
        } else {
            showToast(result.message || "Error al actualizar perfil");
        }
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        showToast("Error de conexión");
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