'use client';

import { useState } from 'react';
import { Answer } from '@/lib/answerSchema';

export default function ITSupportPage() {
  const [issue, setIssue] = useState('');
  const [os, setOs] = useState<'Windows' | 'macOS' | 'Android' | 'iOS' | 'ChromeOS' | 'Linux'>('Windows');
  const [device, setDevice] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState('');
  const [worked, setWorked] = useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnswer(null);
    setWorked(null);

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ issue, os, device }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setAnswer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getOSBadgeColor = (osName: string) => {
    const colors = {
      'Windows': 'bg-blue-100 text-blue-800',
      'macOS': 'bg-gray-100 text-gray-800',
      'Android': 'bg-green-100 text-green-800',
      'iOS': 'bg-gray-100 text-gray-800',
      'ChromeOS': 'bg-red-100 text-red-800',
      'Linux': 'bg-orange-100 text-orange-800'
    };
    return colors[osName as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">IT Support Assistant</h1>
          <p className="text-lg text-gray-600">
            Get step-by-step solutions for your technical issues
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="issue" className="block text-sm font-medium text-gray-700 mb-2">
                Describe your issue
              </label>
              <textarea
                id="issue"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="e.g., My computer won't turn on, I can't connect to WiFi, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="os" className="block text-sm font-medium text-gray-700 mb-2">
                  Operating System
                </label>
                <select
                  id="os"
                  value={os}
                  onChange={(e) => setOs(e.target.value as 'Windows' | 'macOS' | 'Android' | 'iOS' | 'ChromeOS' | 'Linux')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="Windows">Windows</option>
                  <option value="macOS">macOS</option>
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                  <option value="ChromeOS">ChromeOS</option>
                  <option value="Linux">Linux</option>
                </select>
              </div>

              <div>
                <label htmlFor="device" className="block text-sm font-medium text-gray-700 mb-2">
                  Device Type
                </label>
                <input
                  type="text"
                  id="device"
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  placeholder="e.g., Laptop, Desktop, Smartphone, Tablet"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Researching...
                </div>
              ) : (
                'Get Solution'
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Answer Display */}
        {answer && (
          <div className="space-y-6">
            {/* Title and Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{answer.answer_title}</h2>
              <p className="text-gray-700 leading-relaxed">{answer.one_paragraph_summary}</p>
            </div>

            {/* Prerequisites */}
            {answer.prereqs.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prerequisites</h3>
                <ul className="space-y-2">
                  {answer.prereqs.map((prereq, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
                      <span className="text-gray-700">{prereq}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Steps */}
            {answer.steps.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step-by-Step Solution</h3>
                <div className="space-y-6">
                  {answer.steps.map((step, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Step {index + 1}: {step.title}
                        </h4>
                        <div className="flex gap-2">
                          {step.os.map((osName, osIndex) => (
                            <span
                              key={osIndex}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOSBadgeColor(osName)}`}
                            >
                              {osName}
                            </span>
                          ))}
                          {step.est_minutes && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              ~{step.est_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{step.detail}</p>
                      
                      {/* Shell Commands */}
                      {step.shell && step.shell.length > 0 && (
                        <div className="mb-3">
                          <div className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm">
                            {step.shell.map((command, cmdIndex) => (
                              <div key={cmdIndex} className="flex items-center justify-between">
                                <span className="text-green-400">$</span>
                                <span className="flex-1 ml-2">{command}</span>
                                <button
                                  onClick={() => copyToClipboard(command)}
                                  className="ml-3 text-gray-400 hover:text-white transition-colors"
                                  title="Copy command"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => copyToClipboard(`${step.title}\n\n${step.detail}`)}
                        className="text-sm text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        Copy step
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worked/Didn't Work Toggle */}
            {answer.steps.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Did this solution work?</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setWorked(true)}
                    className={`px-6 py-3 rounded-md font-medium transition-colors ${
                      worked === true
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    ✅ Worked
                  </button>
                  <button
                    onClick={() => setWorked(false)}
                    className={`px-6 py-3 rounded-md font-medium transition-colors ${
                      worked === false
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    ❌ Didn&apos;t Work
                  </button>
                </div>
              </div>
            )}

            {/* Decision Tree - Show when "Didn't Work" is selected */}
            {worked === false && answer.decision_tree.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alternative Solutions</h3>
                <div className="space-y-4">
                  {answer.decision_tree.map((decision, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-gray-900">IF: {decision.if}</h4>
                        {decision.link_step && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Try Step {decision.link_step}
                          </span>
                        )}
                      </div>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <span className="font-medium text-blue-800">THEN:</span>
                        <p className="text-blue-700 mt-1">{decision.then}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagrams */}
            {answer.diagrams.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visual Diagrams</h3>
                <div className="space-y-6">
                  {answer.diagrams.map((diagram, index) => (
                    <figure key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div
                        className="flex justify-center"
                        dangerouslySetInnerHTML={{ __html: diagram.svg }}
                      />
                      {diagram.caption && (
                        <figcaption className="text-center text-sm text-gray-600 mt-3">
                          {diagram.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {answer.citations.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sources & References</h3>
                <ul className="space-y-3">
                  {answer.citations.map((citation, index) => (
                    <li key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 mb-1">{citation.title}</h5>
                          <p className="text-gray-600 text-sm mb-2">{citation.quote}</p>
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            View source
                          </a>
                        </div>
                        <button
                          onClick={() => copyToClipboard(`${citation.title}\n${citation.quote}\n${citation.url}`)}
                          className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy citation"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {answer.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4">⚠️ Important Warnings</h3>
                <ul className="space-y-2">
                  {answer.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
                      <span className="text-yellow-700">{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
