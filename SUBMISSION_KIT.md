# VisionNav AI — Hack in Hills ’26 Official Submission Kit

This kit contains all promotional copy, recording scripts, social media text, and checklist items for **Hack in Hills ’26** submission.

---

## 👥 Team Breakdown & Roles

- **Shivam (Lead Developer & Integration):** FastAPI backend, React dashboard integration, dynamic obstacle detection & real-time replanning engine, state synchronization, input validation, testing, and submission lead.
- **Saksham (Pathfinding Algorithm):** Core A* pathfinding implementation, Manhattan distance heuristic optimization, and priority queue graph search.
- **Vaishnavi (Presentation & Pitch):** Presentation deck (PPT), project pitch narrative, UI/UX conceptual alignment, and demo script review.

---

## 🎬 1. Demo Video Guide & Script (2 Minutes)

### Recording Setup
- **Resolution:** 1080p (1920×1080) at 60fps
- **Screen Layout:** Open `http://127.0.0.1:5173` in full screen (or split 75% browser, 25% terminal running `uvicorn`).
- **Tool:** OBS Studio, Loom, or Windows Game Bar (`Win + Alt + R`).
- **Target Duration:** 1:45 to 2:15 minutes.

### Shot-by-Shot Walkthrough & Voiceover Script

| Timestamp | Screen Action | Voiceover Script |
|---|---|---|
| **0:00 – 0:20** | Show dashboard top header with "VisionNav AI — Hack in Hills ’26 Prototype" and the live telemetry stats. | *"Hello everyone! This is team VisionNav AI at Hack in Hills ’26. I am Shivam, and along with Saksham and Vaishnavi, we built an intelligent autonomous robot navigation system with real-time dynamic obstacle avoidance."* |
| **0:20 – 0:45** | Click **"Find Optimal Route (A*)"**. Highlight the green route line and stats (Route Distance: 22 steps, Nodes Explored). Click **"Start Movement Simulation"**. | *"In real-world environments like warehouse logistics or disaster zones, robots need mathematically optimal paths. Here, our A* pathfinding algorithm—engineered by Saksham using Manhattan distance heuristics—calculates the optimal collision-free route in milliseconds. As we hit Start, the simulated robot begins its traversal step-by-step."* |
| **0:45 – 1:20** | While robot is moving at around step 5, click **"⚡ Drop Obstacle on Route"** (or click Add Wall directly ahead of the robot). Show the robot pausing, the amber notification, the route recalculating in real-time, and the "Dynamic Replans" counter incrementing to 1. | *"Now, here is the real challenge: unpredictable dynamic obstacles. Notice what happens when an obstacle suddenly appears directly in the robot’s path. The system detects the obstruction in real-time, interrupts the previous path, recalculates an alternative collision-free detour from the robot's exact coordinates, and resumes navigation without any manual intervention!"* |
| **1:20 – 1:45** | Change scenario from top dropdown to **"Unreachable Trap Test"**. Drop an obstacle closing the final opening to the goal. Click Find Route or start moving. Show the red banner: **"DESTINATION UNREACHABLE"**. | *"Safety is paramount. What if all possible paths are blocked? We built an automated failsafe: when our backend detects that the destination is mathematically unreachable, it halts the robot immediately, illuminates an emergency alert banner, and notifies mission control to prevent collisions."* |
| **1:45 – 2:00** | Click **"Reset Environment"** to show instant recovery. Show the test suite in terminal (`pytest -v` passing 14/14 tests). | *"With clean REST API contracts, 100% test coverage with 14 passing automated tests, and a responsive React dashboard, VisionNav AI brings production-grade autonomous intelligence to life. Thank you Hack in Hills ’26!"* |

---

## 💼 2. LinkedIn Post Copy (Ready to Publish)

> **Copy and paste the text below directly into LinkedIn:**

```text
🚀 Thrilled to present VisionNav AI — our submission for Hack in Hills ’26! 🤖🏔️

Autonomous Mobile Robots (AMRs) in warehouses, hospitals, and search-and-rescue operations face a critical challenge: what happens when dynamic, unexpected obstacles block their planned route?

To solve this, our team developed VisionNav AI — an intelligent autonomous robot navigation platform combining optimal A* pathfinding with reactive, real-time dynamic obstacle avoidance.

💡 Key Highlights:
✅ Optimal Pathfinding: A* algorithm with Manhattan distance heuristic guaranteeing the shortest route while minimizing explored search nodes.
✅ Reactive Dynamic Replanning: On-the-fly conflict detection that instantly calculates a collision-free detour when an obstacle suddenly blocks the active trajectory.
✅ Safety Failsafe: Automated detection of trapped/unreachable destinations, immediately halting traversal and alerting operators.
✅ Full-Stack Architecture: High-performance FastAPI backend paired with a real-time React 18 dashboard, live telemetry, and multiple scenario presets.
✅ Production-Grade Quality: 14 passing automated test suites with atomic state rollbacks.

👥 Proud of the team collaboration:
• Shivam (Integration, FastAPI backend, simulation engine, dynamic obstacle avoidance, and tests)
• Saksham (A* pathfinding algorithm and heuristic optimization)
• Vaishnavi (Presentation deck, pitch strategy, and narrative alignment)

A huge shoutout to the organizers, mentors, and community for hosting this incredible hackathon:
Eren | Builder Base | Nexido | Web3 India

Check out our demo and GitHub repository below! 👇
🔗 GitHub: [INSERT_YOUR_GITHUB_REPO_URL]
🎥 Demo Video: [INSERT_YOUR_DEMO_VIDEO_URL]

#HackInHills #Robotics #AutonomousNavigation #ArtificialIntelligence #FastAPI #ReactJS #AStarAlgorithm #TechInnovation #BuilderBase #Nexido #Web3India
```

---

## 📱 3. Instagram Reel Script & Concept

- **Format:** 9:16 Vertical Video (1080×1920)
- **Duration:** 45 – 60 seconds
- **Audio Suggestion:** Upbeat tech / synthwave trending audio (e.g., electronic future bass).
- **Caption Text:** See below.

### Visual & Voiceover Breakdown

| Frame / Scene | Visual on Screen | On-Screen Text Hook | Voiceover (Voice or AI Voice) |
|---|---|---|---|
| **Scene 1 (0:00 - 0:08)** | Fast zoom-in onto the glowing cyberpunk grid dashboard with robot moving. | *"What happens when a robot's path is suddenly blocked? 🤖🚨"* | *"What happens when an autonomous robot encounters a sudden wall in its path?"* |
| **Scene 2 (0:08 - 0:20)** | Screen recording showing clicking "Find Optimal Route" and the robot starting to move along the green line. | *"A* Pathfinding in Action ⚡"* | *"Meet VisionNav AI, our project for Hack in Hills ’26! We combined optimal A* search with real-time dynamic obstacle avoidance."* |
| **Scene 3 (0:20 - 0:35)** | Close-up on the mouse clicking "⚡ Drop Obstacle on Route" right in front of the robot. The path dynamically bends into an alternative route! | *"Real-Time Dynamic Rerouting! 🤯"* | *"Watch this: an obstacle drops right in front of the robot. Instead of crashing, the system detects the blockage live, calculates an alternative route on-the-fly, and reaches the goal!"* |
| **Scene 4 (0:35 - 0:48)** | Quick cut showing the "Unreachable Trap" red alert banner, then the team credits and Hack in Hills logo. | *"Safety Failsafe + 100% Test Coverage 🛡️"* | *"And if the destination is trapped, our safety failsafe halts the robot instantly. Built with FastAPI and React by Shivam, Saksham, and Vaishnavi!"* |
| **Scene 5 (0:48 - 0:55)** | Call to action screen with GitHub link and Hack in Hills '26 sticker. | *"Built for Hack in Hills ’26 🏔️ Link in bio!"* | *"Check out our GitHub link in bio and let us know what you think in the comments!"* |

### Instagram Caption & Hashtags
```text
Can an autonomous robot think on its feet when unexpected obstacles block its way? 🤖⚡

Presenting VisionNav AI — our project for Hack in Hills ’26! 🏔️
We built an autonomous navigation simulator that pairs A* optimal pathfinding with real-time dynamic obstacle detection and on-the-fly rerouting.

Built with Python (FastAPI) and React 18 by:
🛠️ Shivam (@your_handle) — Backend & Integration Lead
🧠 Saksham (@saksham_handle) — Pathfinding Algorithm
🎨 Vaishnavi (@vaishnavi_handle) — Presentation & Pitch

Big thanks to @hackinhills @builderbase @nexido @web3india for an amazing hackathon experience!

Check out our full source code on GitHub (link in bio)! 🚀

#HackInHills #Robotics #AutonomousRobot #AI #CodingLife #WebDevelopment #Python #FastAPI #ReactJS #TechInnovation #DeveloperCommunity
```

---

## 🚀 4. Git Repository Initialization & Push Steps

Run these commands in PowerShell in the project directory:

```powershell
# 1. Initialize git in the project root
cd c:\Users\stha8\Downloads\VisionNav_AI_Shivam_Backend_Integration_v2
git init

# 2. Stage all project files (ignoring venv and node_modules via .gitignore)
git add .

# 3. Create initial commit
git commit -m "feat: VisionNav AI complete integration - A* pathfinding, dynamic obstacle avoidance, and React dashboard"

# 4. Set branch to main
git branch -M main

# 5. Link to your public GitHub repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/VisionNav-AI.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 📝 5. Final Google Form Submission Checklist

Before submitting the official Google Form, verify you have all 4 links:

1. [ ] **GitHub Repository Link:** `https://github.com/YOUR_USERNAME/VisionNav-AI` *(Make sure the repo is set to **Public**!)*
2. [ ] **Demo Video Link:** YouTube / Google Drive / Loom video link *(Ensure link access is set to **"Anyone with the link can view"**)*
3. [ ] **LinkedIn Post Link:** Direct link to your published post tagging Eren, Builder Base, Nexido, and Web3 India.
4. [ ] **Instagram Reel Link:** Direct link to the published Instagram Reel.
5. [ ] **Team Information:**
   - Shivam (Lead Developer / Integration / Submission)
   - Saksham (Pathfinding Algorithm)
   - Vaishnavi (Presentation & Pitch Deck)
