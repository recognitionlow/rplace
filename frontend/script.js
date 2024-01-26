const canvas = document.querySelector('#canvas');
const context = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const showBorder = document.getElementById('showBorder');
const dial = document.getElementById('dial');
const loading = document.getElementById('loading');
loading.showModal();
let currentColor = colorPicker.value;
let socket;
var time;
const publishableKey = "pk_test_a25vd2luZy1jb3JnaS00MS5jbGVyay5hY2NvdW50cy5kZXYk"; // <- Add Publishable Key here

const startClerk = async () => {
    const Clerk = window.Clerk;

    try {
        // Load Clerk environment and session if available
        await Clerk.load();

        const userButton = document.getElementById("user-button");
        const authLinks = document.getElementById("auth-links");

        Clerk.addListener(({ user }) => {
            // Display links conditionally based on user state
            authLinks.style.display = user ? "none" : "block";
        });

        if (Clerk.user) {
            // Mount user button component
            Clerk.mountUserButton(userButton);
            userButton.style.margin = "auto";
        }
    } catch (err) {
        console.error("Error starting Clerk: ", err);
    }
};

function drawPixel(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x, y, 1, 1);
}

function initializeCanvas(data) {
    data.forEach(pixel => {
        const { coordinate, color } = pixel;
        const [x, y] = coordinate.split(',').map(Number);
        drawPixel(x, y, color);
    });
    loading.close();
    doAction = updateCanvas;
}

function updateCanvas(data) {
    const { x, y, color, time } = data;
    const pixelData = context.getImageData(x, y, 1, 1).data;
    drawPixel(x, y, color);
}

function handleCanvasClick(event) {
    if (!Clerk.user) {
        Clerk.openSignIn()
        return;
    }
    if (time && Date.now() - time < 300000) {
        dial.showModal();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / 2);
    const y = Math.floor((event.clientY - rect.top) / 2);
    drawPixel(x, y, currentColor);

    const pixelData = {
        x: x,
        y: y,
        color: currentColor,
        user: Clerk.user.id,
    };
    socket.send(JSON.stringify({ "action": "sendmessage", "message": pixelData }));
    time = Date.now();
}

function displayError() {
    const errorMessage = document.querySelector('.error-message');
    const error = document.querySelector('#error');
    loading.close();
    error.showModal();
    errorMessage.style.display = 'block';
    errorMessage.textContent = 'Failed to connect to server';
}

function connectWebSocket() {
    socket = new WebSocket('wss://yfmh5o1hc7.execute-api.us-east-2.amazonaws.com/production/');

    socket.addEventListener('open', (event) => {
        socket.send(JSON.stringify({ "action": "initialize" }));
    });

    socket.addEventListener('error', (error) => {
        if (error.code == 403) {
            dial.showModal();
            return
        }
        displayError();
    });

    socket.addEventListener('message', (event) => {
        if (!event.data) return;
        if (JSON.parse(event.data).message == 'Internal server error') {
            displayError();
            return;
        }
        const data = JSON.parse(event.data);
        doAction(data);
    });
}

(() => {
    const script = document.createElement("script");
    script.setAttribute("data-clerk-publishable-key", publishableKey);
    script.async = true;
    script.src = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", startClerk);
    script.addEventListener("error", () => {
        document.getElementById("no-frontend-api-warning").hidden = false;
    });
    document.body.appendChild(script);
})();

colorPicker.addEventListener('input', function () {
    currentColor = colorPicker.value;
});

canvas.addEventListener('click', handleCanvasClick);

var doAction = initializeCanvas;
connectWebSocket();