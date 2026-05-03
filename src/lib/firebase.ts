import { AnalysisResult } from './analysis';

export async function cacheAnalysis(result: AnalysisResult) {
  try {
    await fetch('/api/cache/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupKey: result.groupKey, data: result }),
    });
  } catch (error) {
    console.error("Local Cache Save Error:", error);
  }
}

export async function getCachedAnalysis(groupKey: string): Promise<AnalysisResult | null> {
  try {
    const res = await fetch(`/api/cache/analysis/${encodeURIComponent(groupKey)}`);
    if (res.ok) {
      return await res.json() as AnalysisResult;
    }
    return null;
  } catch (error) {
    console.error("Local Cache Load Error:", error);
    return null;
  }
}

export async function cacheReport(groupKey: string, report: string) {
  try {
    await fetch('/api/cache/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupKey, report }),
    });
  } catch (error) {
    console.error("Local Report Cache Save Error:", error);
  }
}

export async function getCachedReport(groupKey: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/cache/report/${encodeURIComponent(groupKey)}`);
    if (res.ok) {
      const data = await res.json();
      return data.report;
    }
    return null;
  } catch (error) {
    console.error("Local Report Cache Load Error:", error);
    return null;
  }
}
