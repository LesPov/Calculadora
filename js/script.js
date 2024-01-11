// ** Sección 1: Lógica inicial de la calculadora ** //

// Referencias a elementos del DOM...
// Declaración de variables globales...
// Obtener referencia al campo de entrada y al historial de cálculos
// Inicialización de variables y elementos del DOM
// Referencias a elementos del DOM...
const inputField = document.calculator.ans;
const historyElement = document.querySelector('#calculation-history');
const voiceButton = document.getElementById('voice-button');
const recognition = new webkitSpeechRecognition();

// Variables globales para seguimiento y cálculos


let calculationHistory = [];
let resultShown = false;
let lastClearTime = 0;
let cleanedTranscript = '';
let lastResult = null;
let isRecognitionActive = false;
let autoCalculateTimer = null;
let lastResultUsed = false; // Variable para rastrear si se ha utilizado el resultado anterior
function updateHistory() {
    historyElement.innerHTML = calculationHistory
        .map(item => {
            const [expression, result] = item.split('=').map(str => str.trim());

            // Agregar espacios alrededor de los operadores
            const formattedExpression = expression.replace(/([\+\-\*\/])/g, ' $1 ');

            return `<div class="calculation-entry">${formattedExpression}<br>= ${formatNumber(result)}</div>`;
        })
        .reverse()
        .join('');
    historyElement.scrollTop = 0;
}

// Cambia la función formatNumberForInput para formatear el número con puntos en lugar de comas
function formatNumberForInput(number) {
    return number.toString();
}

// Cambia la función formatNumber para formatear el número con puntos en lugar de comas
function formatNumber(number) {
    return number.toString();
}




// Limpia el campo de entrada
function clearInput() {
    inputField.value = '';
}

// Limpia todo el historial de cálculos
function clearHistory() {
    calculationHistory = [];
    updateHistory();
}

// Valida el contenido del campo de entrada
function validateInput() {
    const expression = inputField.value.trim();

    // Realiza validaciones en la expresión ingresada
    if (/[\+\-\*\/]{2,}|^[\*\/]|^0\d|[\+\-\*\/]$/.test(expression)) {
        showInputError("Error en la entrada");
        return false;
    }

    return true;
}


// Muestra un mensaje de error en el campo de entrada
function showInputError(message) {
    inputField.value = message;
    inputField.classList.add('error');
    setTimeout(() => {
        // Limpia el mensaje de error después de 1 segundo
        inputField.value = '';
        inputField.classList.remove('error');
    }, 1000);
}

// Limpia el campo de entrada y el resultado posible
function clearInputAndResult() {
    inputField.value = '';
    hidePossibleResult();
}


// ** Sección 2: Funciones para problemas manuales ** //

// Agrega detectores de eventos a los botones
// Configuración de eventos para los botones de la calculadora
// ** Sección 2: Funciones para problemas manuales ** //

// Configuración de eventos para los botones de la calculadora
const buttons = document.querySelectorAll('input[type="button"]');
buttons.forEach(button => {
    const value = button.value;

    if (value === '=' || value === 'C') {
        button.addEventListener('click', handleEqualsAndClear);
    } else {
        button.addEventListener('click', handleNumberAndOperators);
    }
});

function handleEqualsAndClear() {
    const isClearButton = this.value === 'C';

    if (isClearButton) {
        handleClearButton();
    } else {
        handleFunctionButton();
    }
}

function handleClearButton() {
    clearInputAndResult();

    if (inputField.value === '' || resultShown) {
        clearHistory();
    }
}

function handleFunctionButton() {
    const value = this.value;

    if (typeof value === 'string') {
        const functionName = window[value.toLowerCase()];

        if (typeof functionName === 'function') {
            functionName();
        }
    }

    if (isNaN(value)) {
        resultShown = false;
    }
}




function handleNumberAndOperators() {
    if (resultShown && isNaN(this.value)) {
        if (!lastResultUsed) {
            inputField.value = lastResult + this.value;
            resultShown = false;
            lastResultUsed = true;
        }
    } else {
        handleInputFieldUpdate(this.value);
    }

    const expression = inputField.value;
    try {
        const possibleResult = eval(expression);
        showPossibleResult(possibleResult);
    } catch (error) {
        // Manejo de errores si es necesario
    }
}


function handleInputFieldUpdate(value) {
    if (value.match(/[\+\-\*\/]/)) {
        inputField.value += value;
        resultShown = false;
        hidePossibleResult();
    } else {
        inputField.value += value;
    }
}




function showPossibleResult(possibleResult, formatForInput) {
    const resultElement = document.getElementById('possible-result');
    if (!isNaN(possibleResult)) {
        const formattedResult = formatForInput ? formatNumberForInput(resultElement) : formatNumber(possibleResult);
        resultElement.textContent = `= ${formattedResult}`;
        resultElement.style.display = 'block';
    } else {
        hidePossibleResult();
    }
}


// Modifica el evento de entrada del campo// Modifica el evento de entrada del campo
inputField.addEventListener('input', function () {
    const expression = inputField.value;
    try {
        const possibleResult = eval(expression);
        showPossibleResult(possibleResult, expression.includes('.'));
    } catch (error) {
        hidePossibleResult();
    }
});


// Oculta el posible resultado en la interfaz
function hidePossibleResult() {
    const resultElement = document.getElementById('possible-result');
    resultElement.textContent = '';
    resultElement.style.display = 'none';
}

const backspaceButton = document.getElementById('backspace-button');
backspaceButton.addEventListener('click', handleBackspace);

function handleBackspace() {
    if (resultShown) {
        handleResultMode();
    } else if (recognition.isStarted && cleanedTranscript) {
        handleVoiceRecognitionBackspace();
    } else {
        handleNormalBackspace();
    }
}

function handleResultMode() {
    clearInputAndResult();
}

function handleVoiceRecognitionBackspace() {
    cleanedTranscript = cleanedTranscript.slice(0, -1);
    processCalculationExpression(cleanedTranscript);
}

function handleNormalBackspace() {
    const currentValue = inputField.value;
    inputField.value = currentValue.slice(0, -1);

    const newExpression = inputField.value;
    if (newExpression === '') {
        hidePossibleResult();
    } else {
        handlePossibleResult(newExpression);
    }
}

function handlePossibleResult(expression) {
    const fullExpression = lastResultUsed ? lastResult + expression : expression;
    try {
        const possibleResult = eval(fullExpression);
        showPossibleResult(possibleResult);
    } catch (error) {
        hidePossibleResult();
    }
}



// ** Sección 3: Funciones para dictados de voz ** //

function convertKeywordsToOperators(transcript) {
    const keywordToOperator = {
        'por': '*',
        'multiplicado': '*',
        'menos': '-',
        'en': '/',  // Agregar "dividido en" como palabra clave para la división
        'más': '+',
        'uno': '1',
        'dos': '2',
        'tres': '3',
        'cuatro': '4',
        'cinco': '5',
        'seis': '6',
        'siete': '7',
        'ocho': '8',
        'nueve': '9',
        'cero': '0',
        // Agregar más palabras clave y operadores según sea necesario
    };

    const words = transcript.split(" ");
    const convertedWords = words.map(word => keywordToOperator[word.toLowerCase()] || word);
    return convertedWords.join("");
}


//Reconocimiento de voz 
recognition.lang = 'es-ES';

// Función para reiniciar el temporizador de cálculo automático
function resetAutoCalculateTimer() {
    if (autoCalculateTimer) {
        clearTimeout(autoCalculateTimer);
    }
    autoCalculateTimer = setTimeout(calculateAndSpeak, 1000);
}

// Modificación en la función calculateAndShowResult
function calculateAndShowResult(expression) {
    try {
        const result = eval(expression);

        calculationHistory.push(`${expression} = ${result}`);
        updateHistory();

        inputField.value = formatNumber(result); // Formatear el resultado
        showPossibleResult(result);

        if (!isNaN(result)) {
            lastResult = result;
        }

        resetAutoCalculateTimer();
    } catch (error) {
        console.error('Error en el cálculo:', error);
        inputField.value = 'Error en el cálculo.';
    }
}


// Función para realizar operaciones con el último resultado calculado
function performOperationWithLastResult(operation) {
    if (lastResult !== null) {
        const currentExpression = inputField.value;
        const newExpression = lastResult + ` ${operation} `;

        // Concatenar con la expresión actual solo si es necesario
        inputField.value = currentExpression.endsWith(newExpression) ? currentExpression : newExpression;

        calculateAndShowResult(inputField.value);
    }
}

   
recognition.onresult = function (event) { 
    const transcript = event.results[0][0].transcript.toLowerCase();
    cleanedTranscript = transcript.trim();

    if (isCommandToClear(cleanedTranscript)) {
        clearResultOrInput();
        return;
    }

    handleCalculationInput(cleanedTranscript);

    updateLastResult();
};

function isCommandToClear(transcript) {
    return transcript.includes("borrar");
}

function handleCalculationInput(transcript) {
    if (lastResult !== null) {
        if (/^\d/.test(transcript)) {
            lastResultUsed = false;
        } else {
            transcript = lastResult + transcript;
            lastResultUsed = true;
        }
    }

    processCalculationExpression(transcript);
}



function isCalculationQuestion(transcript) {
    return transcript.includes("cuánto es") || transcript.includes("cuanto es");
}

function removeCalculationQuestion(transcript) {
    return transcript.replace("cuánto es", "").replace("cuanto es", "");
}

function updateLastResult() {
    if (!isNaN(lastResult)) {
        lastResult = eval(inputField.value);
    }
}


// Función para cambiar el diseño del botón del micrófono
// Función para cambiar el diseño del botón del micrófono
function toggleVoiceButtonDesign(active) {
    if (active) {
        voiceButton.classList.add('active');
        voiceButton.style.backgroundColor = '#e06112';
        voiceButton.style.color = 'white';
    } else {
        voiceButton.classList.remove('active');
        voiceButton.style.backgroundColor = 'transparent';
        voiceButton.style.color = '#e06112';
    }
}
// Evento que se dispara al iniciar y detener el reconocimiento de voz
recognition.onstart = function () {
    isRecognitionActive = true;
    toggleVoiceButtonDesign(true); // Cambiar diseño al activar reconocimiento
    cleanedTranscript = ''; // Reiniciar la expresión dictada limpiada
};

recognition.onend = function () {
    isRecognitionActive = false;
    toggleVoiceButtonDesign(false); // Cambiar diseño al detener reconocimiento
    cleanedTranscript = ''; // Reiniciar la expresión dictada limpiada
};

// Función para borrar el resultado o el campo de entrada
function clearResultOrInput() {
    if (resultShown) {
        clearResult();
    } else {
        clearInput();
        hidePossibleResult();
    }
}

// Función para borrar el resultado
function clearResult() {
    inputField.value = ''; // Limpiar el campo de entrada
    hidePossibleResult();
    resultShown = false; // Restablecer el indicador de resultado mostrado
    lastResult = null; // Reiniciar el último resultado
}


function processCalculationExpression(expression) {
    if (lastResult !== null && !lastResultUsed) {
        clearInputAndResult();
        lastResultUsed = true;
    } else {
        lastResultUsed = false;
    }

    // Eliminar espacios alrededor de los operadores en la expresión dictada
    expression = expression.replace(/ ([+\-*\/]) /g, "$1");

    console.log('Expresión original:', expression);

    const convertedTranscript = convertKeywordsToOperators(expression);
    const newExpression = lastResultUsed ? `${lastResult} ${convertedTranscript}` : convertedTranscript;

    console.log('Nueva expresión:', newExpression);

    inputField.value = newExpression;
    
    try {
        const possibleResult = eval(newExpression);
        showPossibleResult(possibleResult);
    } catch (error) {
        hidePossibleResult();
        console.error('Error en el cálculo:', error);
        inputField.value = 'Error en el cálculo.';
    }

    resetAutoCalculateTimer();
}








// Evento que se dispara al hacer clic en el botón de voz
voiceButton.addEventListener('click', function () {
    if (!recognition.isStarted) {
        if (!resultShown) {
            inputField.value = '';
        }
        recognition.start();
        voiceButton.classList.add('active');
        voiceButton.style.backgroundColor = '#e06112';
        voiceButton.style.color = 'white';
        cleanedTranscript = ''; // Reiniciar la expresión dictada limpiada
        lastResultUsed = false; // Permitir el uso del resultado anterior
    }
});
// Función para calcular el resultado sin proporcionar respuesta en voz
// Modificación en la función calculateWithoutSpeaking
function calculateWithoutSpeaking() {
    const expression = inputField.value;

    try {
        const result = eval(expression);

        // Agregar la operación manual al historial antes de limpiar el campo de entrada
        calculationHistory.push(`${expression} = ${result}`);
        updateHistory();

        // Formatear el resultado antes de asignarlo al campo de entrada
        inputField.value = formatNumber(result);
        resultShown = true;
        hidePossibleResult();
    } catch (error) {
        console.error('Error en el cálculo:', error);
        inputField.value = 'Error en el cálculo.';
    }
}


// Función para calcular el resultado y proporcionar respuesta en voz
// Calcular el resultado de la expresión y proporcionar respuesta en voz
function calculateAndSpeak() {
    const expression = inputField.value;

    try {
        const result = eval(expression);

        // Agregar la operación al historial antes de limpiar el campo de entrada
        calculationHistory.push(`${expression} = ${result}`);
        updateHistory();

        // Hablar el resultado en voz
        const message = `  ${result}`; // Modificar para incluir expresión
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(message);
        synth.speak(utterance);

        // Limpiar el campo de entrada y actualizar la interfaz
        inputField.value = result;
        resultShown = true;
        hidePossibleResult();
    } catch (error) {
        console.error('Error en el cálculo:', error);
        inputField.value = 'Error en el cálculo.';
    }
}

/// Evento que se dispara al hacer clic en el botón de igual (=) para realizar el cálculo y mostrar el posible resultado sin dictado
const equalsButton = document.querySelector('.operation-buttonecuals');
equalsButton.addEventListener('click', function () {
    if (recognition.isStarted) {
        calculateWithoutSpeaking();
        const expression = inputField.value;
        const result = eval(expression);

        if (!isNaN(result)) {
            lastResult = result;
        }

        const formattedResult = formatNumber(result); // Formatear el resultado
        const calculation = `${expression} = ${formattedResult}`;
        calculationHistory.push(calculation);
        updateHistory();
        inputField.value = formattedResult; // Formatear el resultado
        resultShown = true;
        hidePossibleResult();
        cleanedTranscript = '';
    }
});
