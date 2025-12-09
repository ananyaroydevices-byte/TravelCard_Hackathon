export async function fetchDestinationImage(destination: string): Promise<string> {
  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(destination + ' travel landmark')}&per_page=1&orientation=landscape`, {
      headers: {
        Authorization: 'FOwS5txJn00kgC5KTCd1wdtSF8WGdFCRKQjxHJ0H9Qb2oqCyFsqB4asP'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const data = await response.json();

    if (data.photos && data.photos.length > 0) {
      return data.photos[0].src.large;
    }

    return 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop';
  } catch (error) {
    console.error('Error fetching destination image:', error);
    return 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop';
  }
}
