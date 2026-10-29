/**
 * Content-level checks for uploaded download files. Everything here is pure and
 * synchronous so the heuristics can be unit tested without storage or network.
 */

export type ScanStatus = "clean" | "suspicious" | "malicious" | "unscanned";

export interface ScanSignal {
  status: ScanStatus;
  engine: string;
  detail: string;
}

export interface InspectInput {
  /** First bytes of the object, enough for magic-number checks. */
  prefix: Buffer;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

const SEVERITY: Record<ScanStatus, number> = {
  unscanned: 0,
  clean: 1,
  suspicious: 2,
  malicious: 3,
};

export function worseSignal(current: ScanSignal | null, next: ScanSignal | null): ScanSignal | null {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return SEVERITY[next.status] > SEVERITY[current.status] ? next : current;
}

/** The EICAR test string. Harmless by design, but every engine flags it. */
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

const MAGIC_SIGNATURES: { name: string; bytes: number[]; family: string }[] = [
  { name: "pe", bytes: [0x4d, 0x5a], family: "windows-executable" },
  { name: "elf", bytes: [0x7f, 0x45, 0x4c, 0x46], family: "unix-executable" },
  { name: "macho", bytes: [0xcf, 0xfa, 0xed, 0xfe], family: "mac-executable" },
  { name: "macho", bytes: [0xca, 0xfe, 0xba, 0xbe], family: "mac-executable" },
  { name: "zip", bytes: [0x50, 0x4b, 0x03, 0x04], family: "archive" },
  { name: "rar", bytes: [0x52, 0x61, 0x72, 0x21], family: "archive" },
  { name: "7z", bytes: [0x37, 0x7a, 0xbc, 0xaf], family: "archive" },
  { name: "pdf", bytes: [0x25, 0x50, 0x44, 0x46], family: "document" },
  { name: "ole", bytes: [0xd0, 0xcf, 0x11, 0xe0], family: "office" },
  { name: "png", bytes: [0x89, 0x50, 0x4e, 0x47], family: "image" },
  { name: "jpeg", bytes: [0xff, 0xd8, 0xff], family: "image" },
  { name: "gif", bytes: [0x47, 0x49, 0x46, 0x38], family: "image" },
];

const EXECUTABLE_FAMILIES = new Set(["windows-executable", "unix-executable", "mac-executable"]);

const EXECUTABLE_EXTENSIONS = new Set([
  "exe",
  "dll",
  "sys",
  "scr",
  "com",
  "msi",
  "elf",
  "so",
  "dylib",
  "bin",
  "app",
]);

/** `invoice.pdf.exe` style names: the real type is the last extension. */
const DOUBLE_EXTENSION = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|csv|zip|rar|mp4|mp3|apk)\.(exe|scr|com|bat|cmd|ps1|vbs|js|jar|msi|lnk|hta)$/i;

function extensionOf(filename: string): string {
  return /\.([A-Za-z0-9]{1,8})$/.exec(filename)?.[1]?.toLowerCase() ?? "";
}

function magicFamily(prefix: Buffer): { name: string; family: string } | null {
  for (const signature of MAGIC_SIGNATURES) {
    if (prefix.length < signature.bytes.length) {
      continue;
    }

    if (signature.bytes.every((byte, index) => prefix[index] === byte)) {
      return { name: signature.name, family: signature.family };
    }
  }

  return null;
}

/**
 * Runs the offline checks. Returns the worst signal found, or null when the
 * content looks consistent with its name.
 */
export function inspectContent(input: InspectInput): ScanSignal | null {
  const text = input.prefix.toString("latin1");

  if (text.includes(EICAR)) {
    return {
      status: "malicious",
      engine: "signature",
      detail: "Matches the EICAR antivirus test signature.",
    };
  }

  if (DOUBLE_EXTENSION.test(input.filename)) {
    return {
      status: "suspicious",
      engine: "heuristic",
      detail: "The file name hides an executable behind a document extension.",
    };
  }

  const magic = magicFamily(input.prefix);
  const extension = extensionOf(input.filename);

  if (magic && EXECUTABLE_FAMILIES.has(magic.family) && !EXECUTABLE_EXTENSIONS.has(extension)) {
    return {
      status: "suspicious",
      engine: "heuristic",
      detail: `The content is a ${magic.name.toUpperCase()} executable but the name says .${extension || "none"}.`,
    };
  }

  if (magic?.family === "archive" && EXECUTABLE_EXTENSIONS.has(extension)) {
    return {
      status: "suspicious",
      engine: "heuristic",
      detail: "An executable extension is used for an archive, so the name was rewritten.",
    };
  }

  return null;
}
