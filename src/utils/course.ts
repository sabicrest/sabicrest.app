/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves a high-quality, professional Unsplash cover image based on course categories or titles.
 * Prioritizes custom image URLs provided by trainers.
 */
export const getCourseImage = (category: string, title?: string, customUrl?: string): string => {
  if (customUrl && customUrl.trim() !== '') {
    return customUrl.trim();
  }
  
  const text = `${title || ''} ${category || ''}`.toLowerCase();
  
  if (text.includes('fluid') || text.includes('typography') || text.includes('graphic') || text.includes('design') || text.includes('brand') || text.includes('visual')) {
    return 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80'; // Typography / design canvas
  }
  
  if (text.includes('cloud') || text.includes('architecture') || text.includes('server') || text.includes('docker') || text.includes('infrastructure')) {
    return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'; // Cloud workspaces / code terminal
  }
  
  if (text.includes('security') || text.includes('cyber') || text.includes('privacy') || text.includes('token') || text.includes('crypt')) {
    return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'; // Cyber circuit / security node
  }
  
  if (text.includes('ai') || text.includes('intelligence') || text.includes('model') || text.includes('neural') || text.includes('smart')) {
    return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'; // Futuristic neural network lights
  }

  if (text.includes('agri') || text.includes('farm') || text.includes('crop') || text.includes('tractor') || text.includes('sustain')) {
    return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80'; // AgriTech rural modern farm
  }

  // Fallback high-contrast aesthetic workspace
  return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80';
};
