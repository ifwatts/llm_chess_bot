# LLM Chess Bot

An interactive web-based chess application featuring an AI opponent powered by a Large Language Model (LLM). Play chess against an intelligent computer opponent with adjustable skill levels, beautiful UI animations, and comprehensive move tracking.

![Chess Application](https://img.shields.io/badge/Chess-AI%20Powered-blue)
![Python](https://img.shields.io/badge/Python-3.11-green)
![Flask](https://img.shields.io/badge/Flask-2.3.3-lightgrey)

## Features

### Gameplay
- **Interactive Chess Board**: Full-featured chess board with drag-and-click piece movement
- **AI Opponent**: Computer player powered by Ollama's Llama2 LLM
- **Adjustable Skill Levels**: 10 difficulty levels from beginner to master (1-10)
- **Move History**: Complete game notation with piece names and move tracking
- **Captured Pieces Display**: Visual tracker showing all captured pieces for both players
- **Last Move Highlighting**: Yellow overlay shows the most recent move
- **AI Move Flash**: 5-second blue animation highlights AI moves for visibility
- **Learning Mode**: Educational hints system with move explanations and visual guidance
- **Hint Levels**: Three complexity levels (Basic, Intermediate, Advanced) for tailored learning

### User Interface
- **Modern Design**: Professional gradient background with chess-themed patterns
- **Coordinate Labels**: Board coordinates (a-h, 1-8) for easy square identification
- **Animated Pieces**: Smooth hover effects and scale animations on pieces
- **Loading Spinner**: Visual feedback during computer thinking time
- **Game Over Overlay**: Elegant end-game notifications for checkmate/stalemate
- **Responsive Layout**: Optimized for desktop viewing with mobile considerations

### Technical Features
- **Containerized Deployment**: Easy setup with Podman/Docker
- **RESTful API**: Clean separation between frontend and backend
- **Chess Engine**: Powered by python-chess library for legal move validation
- **Skill Tuning System**: Multi-layered difficulty adjustment using prompt engineering, temperature control, and move filtering

## Requirements

- **Container Runtime**: Podman or Docker
- **Compose Tool**: Podman Compose or Docker Compose
- **Web Browser**: Modern browser with JavaScript enabled (Chrome, Firefox, Safari, Edge)

## Quick Start

### Option 1: Local Podman/Docker Deployment

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/llm_chess_bot.git
cd llm_chess_bot
```

#### 2. Build and Deploy

**Using Podman (Recommended):**
```bash
# Build the containers
podman-compose build

# Start the services
podman-compose up -d

# Check container status
podman-compose ps
```

**Using Docker:**
```bash
# Build the containers
docker-compose build

# Start the services
docker-compose up -d

# Check container status
docker-compose ps
```

#### 3. Automatic Model Download

The llama2 model (approximately 3.8GB) will be automatically downloaded on first startup. This may take several minutes depending on your internet connection. You can monitor the download progress:

```bash
# For Podman
podman logs -f llm_chess_bot_ollama_1

# For Docker
docker logs -f llm_chess_bot_ollama_1
```

Wait until you see "Ollama is ready!" in the logs before proceeding.

#### 4. Access the Application

Open your web browser and navigate to:
```
http://localhost:5001
```

You should see the chess board ready to play!

### Option 2: OpenShift Cluster Deployment

#### Prerequisites

- **OpenShift CLI (oc)**: Install from [OpenShift CLI documentation](https://docs.openshift.com/container-platform/4.11/cli_reference/openshift_cli/getting-started-cli.html)
- **Cluster Access**: Admin or developer access to an OpenShift cluster
- **.env Configuration**: Create a `.env` file with cluster credentials

#### 1. Configure Cluster Access

Create a `.env` file in the project root with your OpenShift cluster configuration:

```bash
# OpenShift Cluster Configuration
OCP_CONSOLE_URL=https://console-openshift-console.apps.your-cluster.com/
OCP_API_URL=https://api.your-cluster.com:6443
OCP_USERNAME=your-username
OCP_PASSWORD=your-password
OCP_SKIP_TLS_VERIFY=true

# Optional: Custom GitHub repository URL (if different from git remote)
GITHUB_REPO_URL=https://github.com/yourusername/llm_chess_bot.git

# Optional: Docker Hub credentials (required for Ollama image pulls)
DOCKER_HUB_USERNAME=your-dockerhub-username
DOCKER_HUB_PASSWORD=your-dockerhub-token-or-password
```

**Note:** Replace the values with your actual cluster details. The `OCP_SKIP_TLS_VERIFY=true` is useful for development clusters with self-signed certificates.

#### 2. Deploy to OpenShift

Run the automated deployment script:

```bash
# Make the script executable
chmod +x deploy-ocp.sh

# Deploy to OpenShift
./deploy-ocp.sh
```

The script will:
- Login to your OpenShift cluster
- Create a dedicated namespace (`llm-chess-bot`)
- Pre-pull base images to avoid Docker Hub rate limits
- Build and push container images from GitHub main branch to the internal registry
- Deploy the chess application and Ollama service
- Configure network policies for secure access
- Pull the llama2 model
- Display the application URL when complete

#### 3. Access the Deployed Application

After deployment completes, the script will display the application URL. The app will be accessible via an OpenShift Route (HTTPS endpoint).

Example output:
```
🎮 Chess App URL: https://chess-app-llm-chess-bot.apps.your-cluster.com
```

#### 4. OpenShift Management Commands

```bash
# View application logs
oc logs -f deployment/chess-app -n llm-chess-bot

# View Ollama service logs
oc logs -f deployment/ollama -n llm-chess-bot

# Get shell access to the chess app
oc exec -it deployment/chess-app -n llm-chess-bot -- bash

# Check deployment status
oc get pods -n llm-chess-bot

# Scale the application
oc scale deployment chess-app --replicas=3 -n llm-chess-bot

# Delete the entire deployment
oc delete namespace llm-chess-bot
```

#### 5. OpenShift-Specific Features

The deployment includes:

- **High Availability**: 2 replicas of the chess application
- **Persistent Storage**: 10GB PVC for Ollama model storage
- **Network Policies**: Secure traffic management between services
- **Resource Limits**: Memory and CPU constraints for stability
- **Health Checks**: Liveness and readiness probes
- **TLS Termination**: Automatic HTTPS via OpenShift Routes
- **Monitoring**: Compatible with OpenShift monitoring stack

## How to Play

1. **Start a Game**: The board loads with white pieces at the bottom (your side)
2. **Make a Move**: Click a piece to select it, then click the destination square
3. **AI Response**: The computer will think and make its move (watch for the blue flash!)
4. **Adjust Difficulty**: Use the skill level slider (1-10) at any time to change AI strength
5. **View History**: Check the right panel to see all moves with piece names
6. **Get Hints**: Click "Get Hint" for move suggestions and explanations
7. **Enable Learning Mode**: Toggle learning mode for enhanced educational features
8. **Adjust Hint Level**: Choose Basic, Intermediate, or Advanced hint complexity
9. **Reset Game**: Click the "Reset Game" button to start over

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/board` | GET | Returns current board state and legal moves |
| `/move` | POST | Processes a player move, triggers AI response |
| `/reset` | POST | Resets game to initial state |
| `/skill-level` | GET | Returns current AI skill level |
| `/skill-level` | POST | Updates AI skill level (1-10) |
| `/hint` | POST | Generates a hint for current position |
| `/learning-mode` | GET | Returns learning mode settings |
| `/learning-mode` | POST | Updates learning mode settings |

### POST /hint

**Purpose**: Generate a hint for the current position

**Request Body**:
```json
{
    "level": "basic"  // "basic", "intermediate", or "advanced"
}
```

**Response** (200 OK):
```json
{
    "move": "e2e4",
    "explanation": "Control the center - this is a key strategic principle in chess.",
    "category": "center",
    "from_square": "e2",
    "to_square": "e4"
}
```

### POST /learning-mode

**Purpose**: Update learning mode settings

**Request Body**:
```json
{
    "enabled": true,
    "hint_level": "intermediate"
}
```

**Response** (200 OK):
```json
{
    "success": true,
    "enabled": true,
    "hint_level": "intermediate"
}
```

### Skill Levels Explained

| Level | Description | Characteristics |
|-------|-------------|-----------------|
| 1-2 | Beginner | Random moves, frequent mistakes, 50% chance of random move |
| 3-4 | Learning | Basic tactics, occasional blunders, 35% chance of random move |
| 5-6 | Intermediate | Considers tactics and piece activity, 20% chance of random move |
| 7-8 | Advanced | Strong tactical and positional play, 10% chance of random move |
| 9 | Expert | Complex evaluations, 5% chance of random move |
| 10 | Master | Objectively best moves, full LLM strength |

### Learning Mode & Hint System

The learning mode provides educational assistance to help players improve their chess skills:

#### Hint Levels
| Level | Description | Explanation Style |
|-------|-------------|-------------------|
| **Basic** | Beginner-friendly | Simple 1-2 sentence explanations focusing on main ideas |
| **Intermediate** | Club player level | 2-3 sentence explanations with tactical details and principles |
| **Advanced** | Expert analysis | 3-4 sentence detailed explanations with strategic considerations |

#### Hint Categories
Hints are color-coded by type:
- **🔴 Capture** - Material gain opportunities
- **🟠 Check** - Attacks on the opponent's king
- **🟣 Checkmate** - Game-ending moves
- **🔵 Development** - Getting pieces into play
- **🟢 Center Control** - Controlling key squares
- **🟡 Castling** - King safety and piece development
- **🟪 Promotion** - Pawn promotion opportunities
- **⚪ General** - Positional improvements

#### Visual Indicators
- **Green highlighting** shows suggested move squares
- **Animated arrows** indicate move direction
- **Light bulb icons** mark hint squares
- **Color-coded explanations** match move categories

## Rebuilding and Redeploying

If you make changes to the code, rebuild and redeploy:

```bash
# Stop containers
podman-compose down

# Rebuild with no cache
podman-compose build --no-cache chess-app

# Start containers
podman-compose up -d
```

## Manual Setup (Without Containers)

If you prefer to run without containers (note: automated model download only works with containerized deployment):

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Ollama
Download and install Ollama from [https://ollama.ai/](https://ollama.ai/)

### 3. Pull the Model
```bash
ollama pull llama2
```

### 4. Run the Application
```bash
# Set port (optional, defaults to 5000)
export PORT=5001

# Start Flask server
python app.py
```

### 5. Access
Navigate to `http://localhost:5001` in your browser

## Configuration

### Changing the LLM Model

Edit [player.py](player.py:22) to use a different Ollama model:

```python
self.model = "llama2"  # Change to another model (e.g., "mistral", "codellama")
```

Available models: [Ollama Library](https://ollama.ai/library)

### Changing the Default Skill Level

Edit [app.py](app.py:14) to set a different starting skill level:

```python
DEFAULT_SKILL_LEVEL = 5  # Change to 1-10
```

### Changing the Port

Edit [docker-compose.yml](docker-compose.yml) to change the exposed port:

```yaml
ports:
  - "5001:5000"  # Change 5001 to your preferred port
```

Or set the PORT environment variable:

```bash
export PORT=8080
python app.py
```

## Testing

The application includes a comprehensive test suite:

### Run Tests
```bash
# Ensure app is running on port 5001
python run_tests.py
```

### Test Coverage
- Basic opening moves validation
- Board state verification
- Pawn promotion mechanics
- Move legality checks

### Writing New Tests
Add test cases to [test_chess.py](test_chess.py):

```python
def test_my_scenario(self):
    """Test description"""
    # Make moves in test mode
    response = self.make_move("e2e4", test_mode=True)
    # Assert board state
    self.assertEqual(response['turn'], 'black')
```

## Project Structure

```
llm_chess_bot/
├── app.py                 # Flask backend server
├── board.py              # Chess board logic wrapper
├── player.py             # Player classes (Human, Computer, AI skill tuning)
├── chess.js              # Frontend game logic
├── index.html            # HTML structure
├── style.css             # UI styling and animations
├── test_chess.py         # Test suite
├── run_tests.py          # Test runner
├── docker-compose.yml    # Container orchestration
├── Dockerfile            # Chess app container
├── requirements.txt      # Python dependencies
├── deploy.sh             # Local Podman/Docker deployment script
├── deploy-ocp.sh         # OpenShift cluster deployment script
├── .env                  # Environment variables (OCP cluster config)
├── k8s/                  # Kubernetes manifests for OCP deployment
│   ├── namespace.yaml
│   ├── chess-app-deployment.yaml
│   ├── ollama-deployment.yaml
│   └── network-policy.yaml
├── ollama/               # Ollama service configuration
│   └── Dockerfile.ollama
├── README.md             # This file
└── ARCHITECTURE.md       # Detailed architecture documentation
```

## Troubleshooting

### Local Deployment Issues

#### Application Won't Start
- **Check containers**: `podman-compose ps` or `docker-compose ps`
- **View logs**: `podman-compose logs` or `docker-compose logs`
- **Port conflict**: Ensure port 5001 is not in use

#### Can't Connect to Ollama
- **Check Ollama container**: `podman logs llm_chess_bot_ollama_1`
- **Verify model**: `podman exec -it llm_chess_bot_ollama_1 ollama list`
- **Restart containers**: `podman-compose restart`

#### AI Moves Are Slow
- LLM processing takes 3-10 seconds per move (normal behavior)
- First moves may be slower due to model initialization
- Consider using a faster model like "mistral" for quicker responses

#### Board Not Displaying
- Check browser console for JavaScript errors (F12)
- Ensure JavaScript is enabled
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache

#### Tests Failing
- Ensure app is running on port 5001
- Check that the board state matches expected values
- Verify test mode is enabled in move requests

### OpenShift Deployment Issues

#### Login Failures
- **Verify credentials**: Check `.env` file contains correct username/password
- **API URL**: Ensure `OCP_API_URL` is accessible from your network
- **TLS Certificate**: If using self-signed certs, set `OCP_SKIP_TLS_VERIFY=true`

#### Build Failures
- **Check build logs**: `oc get builds -n llm-chess-bot` and `oc logs build/<build-name>`
- **Registry access**: Ensure you have permissions to push to the internal registry
- **Docker Hub auth**: Add `DOCKER_HUB_USERNAME` and `DOCKER_HUB_PASSWORD` to `.env` file
- **Dockerfile**: Verify Dockerfile syntax and dependencies
- **Rate limits**: Use Docker Hub credentials to avoid anonymous pull limits

#### Pod Issues
- **Check pod status**: `oc get pods -n llm-chess-bot`
- **View pod logs**: `oc logs -f <pod-name> -n llm-chess-bot`
- **Describe pod**: `oc describe pod <pod-name> -n llm-chess-bot`
- **Resource limits**: Check if pods are hitting memory/CPU limits

#### Network Issues
- **Route status**: `oc get routes -n llm-chess-bot`
- **Service connectivity**: `oc get svc -n llm-chess-bot`
- **Network policies**: Verify network policies allow required traffic
- **DNS resolution**: Check if services can resolve each other

#### Model Download Issues
- **Storage space**: Ensure PVC has enough space (default 10GB)
- **Network connectivity**: Verify cluster can download models from internet
- **Manual download**: `oc exec -it deployment/ollama -n llm-chess-bot -- ollama pull llama2`

#### Performance Issues
- **Resource scaling**: Increase CPU/memory limits in deployment manifests
- **Replica count**: Scale chess app: `oc scale deployment chess-app --replicas=3 -n llm-chess-bot`
- **Node resources**: Check cluster node utilization

#### Cleanup and Redeploy
```bash
# Delete entire namespace (cleanup)
oc delete namespace llm-chess-bot

# Redeploy from scratch
./deploy-ocp.sh
```

## Development

### Making UI Changes

1. Edit [style.css](style.css), [index.html](index.html), or [chess.js](chess.js)
2. Rebuild: `podman-compose build --no-cache chess-app`
3. Restart: `podman-compose up -d`
4. Hard refresh browser (Ctrl+Shift+R)

### Making Backend Changes

1. Edit [app.py](app.py), [board.py](board.py), or [player.py](player.py)
2. Rebuild and restart (same as UI changes)
3. Check logs: `podman-compose logs chess-app`

### Git Workflow

Create feature branches for changes:

```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "Description of changes"
git push origin feature/my-feature
```

## Architecture

For detailed information about the application architecture, design decisions, and implementation details, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **python-chess**: Chess move validation and game logic
- **Ollama**: Local LLM inference
- **Flask**: Backend web framework
- **Inter Font**: Professional typography by Rasmus Andersson

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
