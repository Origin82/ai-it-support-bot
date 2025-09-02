/**
 * Internal runbooks with suggested step outlines and diagram specs
 * These are hints the model can reference after verifying via tools
 * NOT to be auto-inserted into final answers
 */

export interface RunbookHint {
  issue: string;
  suggestedSteps: string[];
  diagramSpec: string;
  os: string[];
  estimatedTime: number;
}

export const COMMON_RUNBOOKS: Record<string, RunbookHint> = {
  "Windows 11 Wi-Fi won't connect": {
    issue: "Windows 11 Wi-Fi won't connect",
    suggestedSteps: [
      "Check Wi-Fi adapter status in Device Manager",
      "Run Windows Network Troubleshooter",
      "Reset network settings with netsh commands",
      "Check router/modem connectivity",
      "Update or rollback Wi-Fi drivers"
    ],
    diagramSpec: "Wi-Fi Adapter -> Windows Network Stack -> Router -> Internet",
    os: ["Windows"],
    estimatedTime: 15
  },

  "Printer offline (Windows/macOS)": {
    issue: "Printer offline (Windows/macOS)",
    suggestedSteps: [
      "Check printer power and USB/network connections",
      "Verify printer is set as default",
      "Clear print queue and restart spooler service",
      "Check printer status in system preferences",
      "Reinstall printer drivers if necessary"
    ],
    diagramSpec: "Computer -> USB/Network -> Printer -> Power Supply",
    os: ["Windows", "macOS"],
    estimatedTime: 10
  },

  "Chrome hijacked by extension": {
    issue: "Chrome hijacked by extension",
    suggestedSteps: [
      "Open Chrome in Safe Mode (disable extensions)",
      "Review and remove suspicious extensions",
      "Reset Chrome settings to default",
      "Scan for malware with Windows Defender",
      "Check browser homepage and search engine settings"
    ],
    diagramSpec: "Chrome Browser -> Extensions -> Malicious Code -> System",
    os: ["Windows", "macOS", "Linux"],
    estimatedTime: 20
  },

  "Clear DNS cache (Windows/macOS)": {
    issue: "Clear DNS cache (Windows/macOS)",
    suggestedSteps: [
      "Open Command Prompt/Terminal as administrator",
      "Run DNS flush command (ipconfig /flushdns or sudo dscacheutil -flushcache)",
      "Restart DNS client service",
      "Test with nslookup or ping",
      "Restart network adapter if issues persist"
    ],
    diagramSpec: "Computer -> DNS Cache -> DNS Server -> Internet",
    os: ["Windows", "macOS"],
    estimatedTime: 5
  },

  "Android Bluetooth not pairing": {
    issue: "Android Bluetooth not pairing",
    suggestedSteps: [
      "Toggle Bluetooth off and on",
      "Forget existing Bluetooth devices",
      "Clear Bluetooth cache in app settings",
      "Check device compatibility and distance",
      "Reset network settings if needed"
    ],
    diagramSpec: "Android Device -> Bluetooth Radio -> Target Device -> Pairing",
    os: ["Android"],
    estimatedTime: 8
  }
};

/**
 * Get a runbook hint by issue description
 * @param issueDescription The issue description to search for
 * @returns RunbookHint if found, undefined otherwise
 */
export function getRunbookHint(issueDescription: string): RunbookHint | undefined {
  const normalizedIssue = issueDescription.toLowerCase().trim();
  
  for (const [key, runbook] of Object.entries(COMMON_RUNBOOKS)) {
    if (normalizedIssue.includes(key.toLowerCase()) || 
        key.toLowerCase().includes(normalizedIssue)) {
      return runbook;
    }
  }
  
  return undefined;
}

/**
 * Get all runbook hints for a specific OS
 * @param os The operating system to filter by
 * @returns Array of RunbookHint objects for the specified OS
 */
export function getRunbookHintsByOS(os: string): RunbookHint[] {
  return Object.values(COMMON_RUNBOOKS).filter(runbook => 
    runbook.os.includes(os)
  );
}

/**
 * Get all available runbook keys
 * @returns Array of runbook issue strings
 */
export function getAllRunbookKeys(): string[] {
  return Object.keys(COMMON_RUNBOOKS);
}
