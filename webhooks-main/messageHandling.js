const path = require("path");
const fs = require("fs");
const database = require("./database"); 
const {
  setPhoneNumberId,
  enviarSaludo,
  enviarMenuEspecialidades,
  enviarPedirFecha,
  enviarConfirmacionCita,
  enviarListaCitas,
  enviarErrorGenerico
} = require("./whatsappTemplates");

function normalizarTextoEntrada(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

module.exports = async (req, res) => {
  const data = req.body;

  try {
    const incomingPhoneNumberId =
      data?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    setPhoneNumberId(incomingPhoneNumberId);

    const message = data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || !message.from) {
      return res.status(200).send("EVENT_RECEIVED");
    }

    const from = message.from;
    const text =
      message.type === "text" && typeof message.text?.body === "string"
        ? normalizarTextoEntrada(message.text.body)
        : "";

    let action = "";
    let extractedValue = "";

    // Lógica para detectar intenciones del usuario
    if (text.includes("hola") || text.includes("buenas") || text.includes("hi")) {
      action = "saludo";
    } else if (text.includes("agendar")) {
      action = "menu_especialidades";
    } else if (text.includes("medicina general") || text.includes("cardiologia") || text.includes("dermatologia") || text.includes("pediatria")) {
      action = "pedir_fecha";
      extractedValue = message.text.body; // Especialidad con formato original
    } else if (text.startsWith("cita ")) {
      action = "confirmar_cita";
      extractedValue = message.text.body.substring(5).trim();
    } else if (text.startsWith("consultar ")) {
      action = "consultar_citas";
      extractedValue = message.text.body.substring(10).trim();
    }

    switch (action) {
      case "saludo":
        await enviarSaludo(from);
        break;
      case "menu_especialidades":
        await enviarMenuEspecialidades(from);
        break;
      case "pedir_fecha":
        await enviarPedirFecha(from, extractedValue);
        break;
      case "confirmar_cita":
        const partes = extractedValue.split(" ");
        if (partes.length >= 4) {
          const fecha = partes[0];
          const hora = partes[1] + " " + partes[2];
          const correo = partes[3];
          
          const especialidad = "Consulta (Vía WhatsApp)";
          
          const result = database.handleCreateAppointment({ email: correo, speciality: especialidad, date: fecha, time: hora });
          if(result.success){
            await enviarConfirmacionCita(from, especialidad, fecha, hora);
          } else {
            await enviarErrorGenerico(from, "No pudimos guardar la cita. Verifica que tu correo esté registrado en la plataforma Web.");
          }
        } else {
          await enviarErrorGenerico(from, "Formato incorrecto. Debe ser: CITA AAAA-MM-DD HH:MM AM/PM correo@email.com");
        }
        break;
      case "consultar_citas":
        const correoConsulta = extractedValue;
        const citas = database.handleGetAppointments(correoConsulta);
        await enviarListaCitas(from, citas);
        break;
      default:
        await enviarSaludo(from);
        break;
    }

    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Error procesando el mensaje de WhatsApp:", error.message);
    return res.status(200).send("EVENT_RECEIVED");
  }
};
