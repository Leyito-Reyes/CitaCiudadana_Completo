const axios = require("./httpClient");
const fs = require("fs");
const {
  whatsappGraphVersion,
  whatsappAccessToken,
  whatsappPhoneNumberId,
} = require("./config");

const graphApiVersion = whatsappGraphVersion;
const accessToken = whatsappAccessToken;
let currentPhoneNumberId = whatsappPhoneNumberId;

function getMessagesUrl() {
  if (!currentPhoneNumberId) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID");
  }
  return `https://graph.facebook.com/${graphApiVersion}/${currentPhoneNumberId}/messages`;
}

function getHeaders() {
  if (!accessToken) {
    throw new Error("Missing WHATSAPP_ACCESS_TOKEN");
  }
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function procesarNumero(to) {
  if (!to) throw new Error("Numero de destinatario no valido");
  return to.startsWith("521") ? to.replace(/^521/, "52") : to;
}

function setPhoneNumberId(phoneNumberId) {
  const clean = String(phoneNumberId || "").trim();
  if (!clean) return;
  currentPhoneNumberId = clean;
}

async function enviarPayload(payload) {
  const url = getMessagesUrl();
  try {
    const response = await axios.post(url, payload, {
      headers: getHeaders(),
      timeout: 15000,
    });
    console.log("Mensaje enviado exitosamente:", response.data);
  } catch (error) {
    console.error("Error enviando mensaje:", error.response?.data || error.message);
  }
}

async function enviarMensajeTexto(to, bodyText) {
  const payload = {
    messaging_product: "whatsapp",
    to: procesarNumero(to),
    type: "text",
    text: { body: bodyText },
  };
  await enviarPayload(payload);
}

// ---- PLANTILLAS CITA CIUDADANA ----

async function enviarSaludo(to) {
  const texto = "👋 ¡Hola! Bienvenido a *CitaCiudadana*, tu asistente médico virtual.\n\nPor favor dime qué deseas hacer:\n1️⃣ Escribe *AGENDAR* para programar una nueva cita.\n2️⃣ Escribe *CONSULTAR* seguido de tu correo para ver tus citas (Ej. CONSULTAR juan@email.com).";
  await enviarMensajeTexto(to, texto);
}

async function enviarMenuEspecialidades(to) {
  const texto = "🏥 *Especialidades Disponibles:*\n\nPor favor, responde con el nombre de la especialidad que necesitas:\n- Medicina General\n- Cardiología\n- Dermatología\n- Pediatría";
  await enviarMensajeTexto(to, texto);
}

async function enviarPedirFecha(to, especialidad) {
  const texto = `Excelente, has elegido *${especialidad}*.\n\n📅 Por favor, escribe la fecha y hora de tu cita en este formato:\n*CITA AAAA-MM-DD HH:MM AM/PM correo@email.com*\n\n(Ejemplo: CITA 2026-07-01 10:00 AM juan@email.com)`;
  await enviarMensajeTexto(to, texto);
}

async function enviarConfirmacionCita(to, especialidad, fecha, hora) {
  const texto = `✅ *¡Cita Confirmada!*\n\nEspecialidad: ${especialidad}\nFecha: ${fecha}\nHora: ${hora}\n\nGracias por confiar en CitaCiudadana.`;
  await enviarMensajeTexto(to, texto);
}

async function enviarListaCitas(to, citas) {
  if (!citas || citas.length === 0) {
    await enviarMensajeTexto(to, "No tienes citas programadas actualmente. Escribe *AGENDAR* para crear una.");
    return;
  }
  
  let texto = "📋 *Tus próximas citas:*\n\n";
  citas.forEach((c, index) => {
    texto += `${index + 1}. ${c.speciality} - ${c.date} a las ${c.time}\n`;
  });
  
  await enviarMensajeTexto(to, texto);
}

async function enviarErrorGenerico(to, mensaje) {
  const texto = `❌ Lo sentimos, ocurrió un error: ${mensaje}.\n\nEscribe *HOLA* para volver al menú principal.`;
  await enviarMensajeTexto(to, texto);
}

module.exports = {
  setPhoneNumberId,
  enviarSaludo,
  enviarMenuEspecialidades,
  enviarPedirFecha,
  enviarConfirmacionCita,
  enviarListaCitas,
  enviarErrorGenerico
};
