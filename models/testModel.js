/**
 * Test Model
 * In a fully built MVC app, Models interact with the database (e.g., MongoDB, PostgreSQL)
 * to fetch, save, or update data.
 */

exports.getTestMessage = () => {
    // Simulating fetching data from a database
    return {
        message: 'Email Automation System API is running successfully!',
        status: 'success',
        notice: 'This specific data is being fetched from the Model layer.'
    };
};
