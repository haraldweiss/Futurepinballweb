#!/usr/bin/env node

/**
 * Future Pinball Web - Cross-Platform Installer
 *
 * Features:
 * - Detects OS (Windows, macOS, Linux)
 * - Checks system requirements (RAM, storage, GPU, Node.js)
 * - Autodetects screen configuration
 * - Installs missing dependencies
 * - Sets up game environment
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync, spawn, spawnSync } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Color output helpers ───
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  debug: (msg) => process.env.DEBUG && console.log(`${colors.cyan}🔍 ${msg}${colors.reset}`),
};

// ─── System Information ───
class SystemInfo {
  constructor() {
    this.osType = os.platform();
    this.osRelease = os.release();
    this.arch = os.arch();
    this.cpuCount = os.cpus().length;
    this.totalMemory = os.totalmem();
    this.freeMemory = os.freemem();
    this.homedir = os.homedir();
  }

  getOSName() {
    const map = {
      'win32': 'Windows',
      'darwin': 'macOS',
      'linux': 'Linux',
    };
    return map[this.osType] || 'Unknown';
  }

  getMemoryGB() {
    return (this.totalMemory / 1024 / 1024 / 1024).toFixed(2);
  }

  getFreeMemoryGB() {
    return (this.freeMemory / 1024 / 1024 / 1024).toFixed(2);
  }

  print() {
    log.info(`OS: ${this.getOSName()} ${this.osRelease}`);
    log.info(`Architecture: ${this.arch}`);
    log.info(`CPUs: ${this.cpuCount}`);
    log.info(`Memory: ${this.getMemoryGB()} GB (${this.getFreeMemoryGB()} GB free)`);
  }
}

// ─── Requirement Checker ───
class RequirementChecker {
  constructor(systemInfo) {
    this.system = systemInfo;
    this.requirements = {
      nodejs: '16.0.0',
      npm: '7.0.0',
      ram: 4, // GB
      storage: 2, // GB
      vram: 2, // GB (optional but recommended)
    };
    this.results = {};
  }

  async check() {
    log.title('🔍 Checking System Requirements');

    await this.checkNodeJS();
    await this.checkNPM();
    await this.checkRAM();
    await this.checkStorage();
    await this.checkGPU();

    return this.results;
  }

  async checkNodeJS() {
    try {
      const version = execSync('node -v', { encoding: 'utf8' }).trim().slice(1);
      // Compare semver-ish: split major.minor.patch and lex-compare per part.
      const cmp = (a, b) => {
        const [aM, am = 0, ap = 0] = a.split('.').map(Number);
        const [bM, bm = 0, bp = 0] = b.split('.').map(Number);
        return (aM - bM) || (am - bm) || (ap - bp);
      };
      if (cmp(version, this.requirements.nodejs) < 0) {
        log.warn(`Node.js ${version} installed (required: ${this.requirements.nodejs}+ — Vite 7 will fail to install on older versions)`);
        this.results.nodejs = { ok: false, version, error: `Node ${this.requirements.nodejs}+ required` };
      } else {
        log.success(`Node.js ${version} installed`);
        this.results.nodejs = { ok: true, version };
      }
    } catch (error) {
      log.error('Node.js not found');
      this.results.nodejs = { ok: false, error: 'Node.js is required' };
      await this.askInstallNodeJS();
    }
  }

  async checkNPM() {
    try {
      const version = execSync('npm -v', { encoding: 'utf8' }).trim();
      log.success(`npm ${version} installed`);
      this.results.npm = { ok: true, version };
    } catch (error) {
      log.error('npm not found');
      this.results.npm = { ok: false, error: 'npm is required' };
    }
  }

  async checkRAM() {
    const available = this.system.getMemoryGB();
    if (available >= this.requirements.ram) {
      log.success(`${available} GB RAM available (required: ${this.requirements.ram} GB)`);
      this.results.ram = { ok: true, available };
    } else {
      log.warn(`${available} GB RAM available (recommended: ${this.requirements.ram} GB)`);
      this.results.ram = { ok: false, available };
    }
  }

  async checkStorage() {
    try {
      let available;
      if (this.system.osType === 'win32') {
        // PowerShell: get free bytes on the drive containing the install dir
        const psScript = '(Get-PSDrive -Name (Get-Location).Drive.Name).Free';
        const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], { encoding: 'utf8' });
        if (result.status !== 0 || !result.stdout) {
          throw new Error(result.stderr || 'PowerShell storage query failed');
        }
        const freeBytes = parseInt(result.stdout.trim(), 10);
        if (Number.isNaN(freeBytes)) {
          throw new Error('Could not parse PowerShell free-space output');
        }
        available = `${(freeBytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
      } else {
        const cmd = 'df -h . | tail -1 | awk \'{print $(NF-2)}\'';
        available = execSync(cmd, { encoding: 'utf8' }).trim();
      }
      log.success(`Storage: ${available} available (required: ${this.requirements.storage} GB)`);
      this.results.storage = { ok: true, available };
    } catch (error) {
      log.warn('Could not determine free storage space');
      this.results.storage = { ok: false, error: 'Could not check storage' };
    }
  }

  async checkGPU() {
    try {
      let hasGPU = false;

      if (this.system.osType === 'darwin') {
        const gpu = execSync('system_profiler SPDisplaysDataType 2>/dev/null | grep "VRAM" || true', { encoding: 'utf8' });
        hasGPU = gpu.length > 0;
      } else if (this.system.osType === 'linux') {
        const gpu = execSync('lspci 2>/dev/null | grep -i "vga\\|3d" || true', { encoding: 'utf8' });
        hasGPU = gpu.length > 0;
      } else if (this.system.osType === 'win32') {
        // PowerShell (CIM) replaces deprecated wmic; locale-independent.
        const psScript = 'Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name';
        const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], { encoding: 'utf8' });
        const gpu = (result.status === 0 && result.stdout) ? result.stdout.trim() : '';
        hasGPU = gpu.length > 0;
      }

      if (hasGPU) {
        log.success('GPU detected');
        this.results.gpu = { ok: true };
      } else {
        log.warn('GPU not detected (integrated GPU will be used)');
        this.results.gpu = { ok: false };
      }
    } catch (error) {
      log.warn('Could not detect GPU');
      this.results.gpu = { ok: false, error: 'GPU detection failed' };
    }
  }
}

// ─── Screen Detector ───
class ScreenDetector {
  constructor(systemInfo) {
    this.system = systemInfo;
  }

  async detect() {
    log.title('🖥️  Detecting Display Configuration');

    try {
      if (this.system.osType === 'darwin') {
        return this.detectMacOS();
      } else if (this.system.osType === 'linux') {
        return this.detectLinux();
      } else if (this.system.osType === 'win32') {
        return this.detectWindows();
      }
    } catch (error) {
      log.warn('Display detection failed, using defaults');
    }

    return {
      screenCount: 1,
      primaryResolution: { width: 1920, height: 1080 },
      rotation: 'landscape',
    };
  }

  detectMacOS() {
    try {
      const output = execSync('system_profiler SPDisplaysDataType 2>/dev/null | grep -E "Resolution|Connected"', {
        encoding: 'utf8',
      });
      const screens = output.match(/\d+x\d+/g) || [];
      const screenCount = screens.length;

      log.success(`Detected ${screenCount} screen(s)`);

      if (screens.length > 0) {
        const [width, height] = screens[0].split('x');
        return {
          screenCount,
          primaryResolution: { width: parseInt(width), height: parseInt(height) },
          rotation: 'landscape',
        };
      }
    } catch (error) {
      log.debug(`macOS display detection failed: ${error.message}`);
    }

    return {
      screenCount: 1,
      primaryResolution: { width: 1920, height: 1080 },
      rotation: 'landscape',
    };
  }

  detectLinux() {
    try {
      const output = execSync('xrandr 2>/dev/null | grep " connected"', { encoding: 'utf8' });
      const screens = output.split('\n').filter((l) => l.trim());
      const screenCount = screens.length;

      log.success(`Detected ${screenCount} screen(s)`);

      if (screens.length > 0) {
        const res = screens[0].match(/\d+x\d+/);
        if (res) {
          const [width, height] = res[0].split('x');
          return {
            screenCount,
            primaryResolution: { width: parseInt(width), height: parseInt(height) },
            rotation: 'landscape',
          };
        }
      }
    } catch (error) {
      log.debug(`Linux display detection failed: ${error.message}`);
    }

    return {
      screenCount: 1,
      primaryResolution: { width: 1920, height: 1080 },
      rotation: 'landscape',
    };
  }

  detectWindows() {
    try {
      // PowerShell + System.Windows.Forms.Screen — locale-independent, JSON output.
      const psScript = 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { @{Width=$_.Bounds.Width; Height=$_.Bounds.Height} } | ConvertTo-Json';
      const result = spawnSync('powershell', ['-NoProfile', '-Command', psScript], { encoding: 'utf8' });

      if (result.status !== 0 || !result.stdout) {
        throw new Error(result.stderr || 'PowerShell screen query failed');
      }

      const parsed = JSON.parse(result.stdout.trim());
      // ConvertTo-Json yields a single object for one screen, an array for multiple.
      const screens = Array.isArray(parsed) ? parsed : [parsed];

      if (screens.length > 0) {
        log.success(`Detected ${screens.length} screen(s)`);
        const primary = screens[0];
        const width = parseInt(primary.Width, 10);
        const height = parseInt(primary.Height, 10);
        if (!Number.isNaN(width) && !Number.isNaN(height)) {
          return {
            screenCount: screens.length,
            primaryResolution: { width, height },
            rotation: 'landscape',
          };
        }
      }
    } catch (error) {
      log.debug(`Windows display detection failed: ${error.message}`);
    }

    return {
      screenCount: 1,
      primaryResolution: { width: 1920, height: 1080 },
      rotation: 'landscape',
    };
  }
}

// ─── Dependency Installer ───
class DependencyInstaller {
  constructor() {
    this.cwd = process.cwd();
  }

  async check() {
    log.title('📦 Checking Dependencies');

    try {
      const packageJsonPath = path.join(this.cwd, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        log.error('package.json not found');
        return false;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const nodeModulesPath = path.join(this.cwd, 'node_modules');

      if (!fs.existsSync(nodeModulesPath)) {
        log.warn('node_modules not found, running npm install...');
        return await this.install();
      }

      log.success('Dependencies already installed');
      return true;
    } catch (error) {
      log.error(`Dependency check failed: ${error.message}`);
      return false;
    }
  }

  async install() {
    return new Promise((resolve) => {
      log.info('Running: npm install (this may take a few minutes)...');

      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const child = spawn(npm, ['install'], {
        cwd: this.cwd,
        stdio: 'inherit',
      });

      child.on('close', (code) => {
        if (code === 0) {
          log.success('Dependencies installed successfully');
          resolve(true);
        } else {
          log.error('npm install failed');
          resolve(false);
        }
      });

      child.on('error', (error) => {
        log.error(`Failed to run npm: ${error.message}`);
        resolve(false);
      });
    });
  }
}

// ─── Configuration Generator ───
class ConfigGenerator {
  constructor(systemInfo, displayConfig) {
    this.system = systemInfo;
    this.display = displayConfig;
  }

  generate() {
    log.title('⚙️  Generating Configuration');

    const quality = this.selectQualityPreset();

    const config = {
      system: {
        os: this.system.osType,
        osName: this.system.getOSName(),
        architecture: this.system.arch,
        cpuCores: this.system.cpuCount,
        totalMemoryGB: parseFloat(this.system.getMemoryGB()),
        nodeVersion: process.version.slice(1),
      },
      display: {
        screenCount: this.display.screenCount,
        primaryResolution: this.display.primaryResolution,
        rotation: this.display.rotation,
      },
      qualityPreset: quality,
      qualitySettings: this.getQualitySettings(quality),
      timestamp: new Date().toISOString(),
    };

    const configPath = path.join(process.cwd(), '.fpw-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    log.success(`Configuration generated: ${configPath}`);
    log.info(`Quality preset: ${colors.bright}${quality}${colors.reset}`);

    return config;
  }

  selectQualityPreset() {
    const ram = parseFloat(this.system.getMemoryGB());
    const resolution = this.display.primaryResolution;
    const pixels = resolution.width * resolution.height;

    // Heuristic: RAM + resolution + screen count
    if (ram >= 32 && pixels >= 3840 * 2160) {
      return 'ultra';
    } else if (ram >= 16 && pixels >= 1920 * 1080) {
      return 'high';
    } else if (ram >= 8 && pixels >= 1366 * 768) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  getQualitySettings(preset) {
    const presets = {
      low: {
        shadowMapSize: 512,
        bloomEnabled: false,
        particleCount: 100,
        volumetricLighting: false,
        ssaoEnabled: false,
      },
      medium: {
        shadowMapSize: 1024,
        bloomEnabled: true,
        particleCount: 300,
        volumetricLighting: false,
        ssaoEnabled: true,
      },
      high: {
        shadowMapSize: 2048,
        bloomEnabled: true,
        particleCount: 600,
        volumetricLighting: true,
        ssaoEnabled: true,
      },
      ultra: {
        shadowMapSize: 4096,
        bloomEnabled: true,
        particleCount: 1000,
        volumetricLighting: true,
        ssaoEnabled: true,
      },
    };

    return presets[preset] || presets.high;
  }
}

// ─── Main Installer ───
class Installer {
  constructor() {
    this.checkOnly = process.argv.includes('--check-only');
  }

  async run() {
    try {
      console.log('\n' + colors.bright + colors.blue + '╔════════════════════════════════════════════════════════╗' + colors.reset);
      console.log(colors.bright + colors.blue + '║     Future Pinball Web - System Setup & Installer       ║' + colors.reset);
      console.log(colors.bright + colors.blue + '╚════════════════════════════════════════════════════════╝\n' + colors.reset);

      // 1. Detect system
      const systemInfo = new SystemInfo();
      systemInfo.print();

      // 2. Check requirements
      const checker = new RequirementChecker(systemInfo);
      await checker.check();

      // 3. Detect display
      const screenDetector = new ScreenDetector(systemInfo);
      const displayConfig = await screenDetector.detect();

      if (this.checkOnly) {
        log.info('Check-only mode: skipping installation');
        return;
      }

      // 4. Install dependencies
      const depInstaller = new DependencyInstaller();
      await depInstaller.check();

      // 5. Generate configuration
      const configGen = new ConfigGenerator(systemInfo, displayConfig);
      const config = configGen.generate();

      // Success
      log.title('✨ Installation Complete!');
      log.success('Future Pinball Web is ready to play');

      log.info('\nNext steps:');
      log.info('  1. Run: npm start');
      log.info('  2. Open: http://localhost:5173');
      log.info('  3. Select demo table or load your own .fpt file');
      log.info('\nConfiguration saved: .fpw-config.json');
      log.info('Your system quality preset: ' + colors.bright + config.qualityPreset + colors.reset);
    } catch (error) {
      log.error(`Installation failed: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    }
  }

  async askInstallNodeJS() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('\n❓ Node.js is required. Would you like installation instructions? (y/n) ', async (answer) => {
        rl.close();

        if (answer.toLowerCase() === 'y') {
          log.title('📦 Node.js Installation');
          log.info('Please visit https://nodejs.org/ and download Node.js LTS');
          log.info('Run the installer and follow the instructions');
          log.info('After installation, re-run this installer');
          process.exit(0);
        }

        resolve();
      });
    });
  }
}

// ─── Run Installer ───
const installer = new Installer();
installer.run().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

export default Installer;
