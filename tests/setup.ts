import '@testing-library/jest-dom';

// Mock fetch globally for tests
global.fetch = vi.fn();

// Mock crypto for IP hashing tests
Object.defineProperty(global, 'crypto', {
  value: {
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => ({
          substring: vi.fn(() => 'a1b2c3d4')
        }))
      }))
    }))
  }
});

// Mock dynamic imports for cheerio
const mockCheerio = {
  default: {
    load: vi.fn(() => ({
      remove: vi.fn().mockReturnThis(),
      find: vi.fn(() => ({
        text: vi.fn(() => 'Mock page content with some text here'),
        each: vi.fn((callback) => {
          // Mock h1, h2, h3 elements
          const mockElements = [
            { text: 'Heading 1' },
            { text: 'Heading 2' },
            { text: 'Heading 3' }
          ];
          mockElements.forEach((element, index) => {
            callback(index, element);
          });
        })
      })),
      text: vi.fn(() => 'Mock page content with some text here')
    }))
  }
};

// Mock the import function for cheerio
vi.stubGlobal('import', vi.fn().mockImplementation((moduleName) => {
  if (moduleName === 'cheerio') {
    return Promise.resolve(mockCheerio);
  }
  return Promise.resolve({});
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};
