// Cloud Function Script to update trending topics
// This should be deployed as a Firebase Cloud Function that runs once per day

const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

/**
 * Updates trending topics based on posts and questions from the last week
 * Run this as a scheduled Firebase Cloud Function (once per day)
 */
async function updateTrendingTopics() {
  try {
    console.log('Starting trending topics update...');
    
    // Get posts and questions from the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Get posts with hashtags
    const postsSnapshot = await db.collection('posts')
      .where('createdAt', '>=', oneWeekAgo.toISOString())
      .get();
    
    // Get questions with tags
    const questionsSnapshot = await db.collection('questions')
      .where('createdAt', '>=', oneWeekAgo.toISOString())
      .get();
    
    // Count hashtags from posts and tags from questions
    const tagCounts = {};
    
    // Count hashtags from posts
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      const hashtags = data.hashtags || [];
      
      hashtags.forEach(tag => {
        const normalizedTag = tag.toLowerCase();
        if (!tagCounts[normalizedTag]) {
          tagCounts[normalizedTag] = 0;
        }
        tagCounts[normalizedTag]++;
      });
    });
    
    // Count tags from questions
    questionsSnapshot.forEach(doc => {
      const data = doc.data();
      const tags = data.tags || [];
      
      tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase();
        if (!tagCounts[normalizedTag]) {
          tagCounts[normalizedTag] = 0;
        }
        tagCounts[normalizedTag]++;
      });
    });
    
    // Convert to array and sort by count
    const sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        posts: count // Total uses (posts + questions)
      }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 3); // Top 3 tags
    
    // Calculate trend percentage (simplified - in production you'd compare with previous week)
    const trendingTopics = sortedTags.map((item, index) => {
      // Simulate trend calculation (you'd compare with last week's data)
      const trendPercentage = Math.floor(Math.random() * 50) + 10; // Random 10-60%
      
      return {
        tag: item.tag,
        posts: item.posts,
        trend: `+${trendPercentage}%`
      };
    });
    
    // Delete existing trending topics
    const existingTopicsSnapshot = await db.collection('trendingTopics').get();
    const batch = db.batch();
    
    existingTopicsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Add new trending topics
    const addBatch = db.batch();
    
    trendingTopics.forEach((topic, index) => {
      const docRef = db.collection('trendingTopics').doc(`topic_${index}`);
      addBatch.set(docRef, topic);
    });
    
    await addBatch.commit();
    
    console.log('Trending topics updated successfully:', trendingTopics);
    return { success: true, topics: trendingTopics };
    
  } catch (error) {
    console.error('Error updating trending topics:', error);
    throw error;
  }
}

// Export for Cloud Functions
exports.updateTrendingTopics = functions.pubsub
  .schedule('0 0 * * *') // Run every day at midnight
  .onRun(async (context) => {
    return await updateTrendingTopics();
  });

// For manual testing
if (require.main === module) {
  updateTrendingTopics()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}