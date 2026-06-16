const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "db.json");

// Inicializar base de datos vacía si no existe
function initDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ users: {}, appointments: [] }, null, 2),
      "utf8"
    );
  }
}

function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error al leer la base de datos:", error.message);
    return { users: {}, appointments: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error al escribir en la base de datos:", error.message);
    return false;
  }
}

// 1. Registro de Usuario
function handleRegister(userData) {
  const { name, email, password } = userData;
  if (!name || !email || !password) {
    return { success: false, message: "Todos los campos son requeridos" };
  }

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();

  if (db.users[normalizedEmail]) {
    return { success: false, message: "El correo ya está registrado" };
  }

  db.users[normalizedEmail] = {
    name,
    email: normalizedEmail,
    password, 
    phone: "",
    age: "",
    curp: "",
    social: "",
    profileImage: "https://via.placeholder.com/150",
  };

  writeDb(db);
  return { success: true, message: "Usuario registrado correctamente" };
}

// 2. Inicio de Sesión
function handleLogin(credentials) {
  const { email, password } = credentials;
  if (!email || !password) {
    return { success: false, message: "Correo y contraseña son requeridos" };
  }

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();
  const user = db.users[normalizedEmail];

  if (!user || user.password !== password) {
    return { success: false, message: "Credenciales incorrectas" };
  }

  // Devolvemos el usuario sin la contraseña por seguridad
  const { password: _, ...userWithoutPassword } = user;
  return { success: true, user: userWithoutPassword };
}

// 3. Actualizar Perfil
function handleUpdateProfile(profileData) {
  const { email, name, phone, age, curp, social, profileImage } = profileData;
  if (!email) {
    return { success: false, message: "El correo de usuario es requerido" };
  }

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();
  const user = db.users[normalizedEmail];

  if (!user) {
    return { success: false, message: "Usuario no encontrado" };
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (age !== undefined) user.age = age;
  if (curp !== undefined) user.curp = curp;
  if (social !== undefined) user.social = social;
  if (profileImage !== undefined) user.profileImage = profileImage;

  db.users[normalizedEmail] = user;
  writeDb(db);

  const { password: _, ...userWithoutPassword } = user;
  return { success: true, user: userWithoutPassword };
}

// 4. Obtener Citas
function handleGetAppointments(email) {
  if (!email) return [];
  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();
  // Filtrar citas correspondientes a este usuario
  return db.appointments.filter((app) => app.email === normalizedEmail);
}

// 5. Crear Cita
function handleCreateAppointment(appointmentData) {
  const { email, speciality, date, time } = appointmentData;
  if (!email || !speciality || !date || !time) {
    return { success: false, message: "Datos de cita incompletos" };
  }

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();

  if (!db.users[normalizedEmail]) {
    return { success: false, message: "Usuario no existe" };
  }

  const newAppointment = {
    email: normalizedEmail,
    speciality,
    date,
    time,
    createdAt: new Date().toISOString(),
  };

  db.appointments.push(newAppointment);
  
  // Ordenar citas para que las más próximas aparezcan primero
  db.appointments.sort((a, b) => new Date(`${a.date} ${a.time.replace(" AM", "").replace(" PM", "")}`) - new Date(`${b.date} ${b.time.replace(" AM", "").replace(" PM", "")}`));

  writeDb(db);
  return { success: true, appointment: newAppointment };
}

// 6. Analizar Síntomas con IA
function handleAnalyzeSymptoms(symptomData) {
  const { message } = symptomData;
  if (!message) {
    return { success: false, response: "Por favor describe tus síntomas." };
  }

  const text = message.toLowerCase();
  let response = "";

  if (text.includes("pecho") || text.includes("corazon") || text.includes("cardio") || text.includes("presion") || text.includes("infarto")) {
    response = "De acuerdo con tus síntomas de molestia en el pecho o presión, te recomiendo agendar una cita con nuestro especialista en **Cardiología**. Nota: Si experimentas dolor agudo o dificultad para respirar, por favor acude a Urgencias de inmediato.";
  } else if (text.includes("piel") || text.includes("roncha") || text.includes("grano") || text.includes("alergia") || text.includes("comezon") || text.includes("mancha")) {
    response = "Dado que mencionas molestias en la piel, ronchas o comezón, lo ideal es que consultes con nuestro servicio de **Dermatología** para evaluar adecuadamente tu caso.";
  } else if (text.includes("niño") || text.includes("bebe") || text.includes("hijo") || text.includes("infantil") || text.includes("pediatra")) {
    response = "Para la atención de menores de edad, te sugerimos agendar una cita con nuestro departamento de **Pediatría** para que reciba la valoración especializada correspondiente.";
  } else if (text.includes("estomago") || text.includes("dolor de cabeza") || text.includes("gripe") || text.includes("tos") || text.includes("fiebre") || text.includes("cuerpo cortado")) {
    response = "Por los síntomas generales que describes (como malestar estomacal, fiebre o dolor general), te sugiero iniciar con una consulta en **Medicina General**. El médico general te recetará tratamiento o te canalizará a la especialidad correcta.";
  } else {
    response = "Entiendo. Para poder orientarte mejor, ¿podrías darme más detalles? Basándome en la descripción inicial, te sugeriría una valoración en **Medicina General** para comenzar.";
  }

  return { success: true, response };
}

// 7. Autenticación con Google
function handleGoogleLogin(userData) {
  const { email, name, googleId } = userData;
  if (!email) return { success: false, message: "Correo de Google requerido" };

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();

  if (!db.users[normalizedEmail]) {
    db.users[normalizedEmail] = {
      name: name || "Usuario de Google",
      email: normalizedEmail,
      password: "",
      phone: "",
      address: "",
      profileImage: "https://via.placeholder.com/150",
      googleId: googleId
    };
    writeDb(db);
  }

  const { password: _, ...userWithoutPassword } = db.users[normalizedEmail];
  return { success: true, user: userWithoutPassword };
}

module.exports = {
  handleRegister,
  handleLogin,
  handleUpdateProfile,
  handleGetAppointments,
  handleCreateAppointment,
  handleAnalyzeSymptoms,
  handleGoogleLogin,
};
