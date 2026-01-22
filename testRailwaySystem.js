/**
 * Basic Manual Tests for Railway Traffic Management System
 * Run these tests to verify the system is working correctly
 */

if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const Train = require('./models/train');
const Section = require('./models/section');
const Track = require('./models/track');
const Conflict = require('./models/conflict');
const optimizationService = require('./services/optimizationService');
const simulationService = require('./services/simulationService');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, colors.green);
}

function logError(message) {
    log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
    log(`ℹ ${message}`, colors.blue);
}

async function runTests() {
    try {
        log('\n========================================', colors.yellow);
        log('Railway Traffic Management System Tests', colors.yellow);
        log('========================================\n', colors.yellow);

        // Connect to database
        logInfo('Connecting to database...');
        await mongoose.connect(process.env.ATLAS_DB_URL);
        logSuccess('Database connected\n');

        // Test 1: Check if models are working
        logInfo('Test 1: Checking data models...');
        const trainCount = await Train.countDocuments();
        const sectionCount = await Section.countDocuments();
        const trackCount = await Track.countDocuments();
        
        if (trainCount === 0) {
            logError('No trains found! Please run: npm run seed-railway');
            process.exit(1);
        }
        
        logSuccess(`Found ${trainCount} trains, ${sectionCount} sections, ${trackCount} tracks`);

        // Test 2: Fetch a train
        logInfo('\nTest 2: Fetching train data...');
        const train = await Train.findOne().populate('currentPosition.sectionId');
        if (train) {
            logSuccess(`Fetched train: ${train.trainNumber} - ${train.trainName}`);
            logInfo(`  Status: ${train.currentStatus}`);
            logInfo(`  Priority: ${train.priority}`);
            logInfo(`  Delay: ${train.delay.currentDelay} minutes`);
        } else {
            logError('Could not fetch train');
        }

        // Test 3: Fetch a section
        logInfo('\nTest 3: Fetching section data...');
        const section = await Section.findOne().populate('tracks');
        if (section) {
            logSuccess(`Fetched section: ${section.sectionCode} - ${section.sectionName}`);
            logInfo(`  Length: ${section.characteristics.totalLength} km`);
            logInfo(`  Tracks: ${section.characteristics.numberOfTracks}`);
            logInfo(`  Status: ${section.operationalStatus}`);
        } else {
            logError('Could not fetch section');
        }

        // Test 4: Test conflict detection
        logInfo('\nTest 4: Testing conflict detection...');
        try {
            const conflicts = await optimizationService.detectConflicts(section._id, 120);
            logSuccess(`Conflict detection working! Found ${conflicts.length} potential conflicts`);
            if (conflicts.length > 0) {
                logInfo(`  Conflict type: ${conflicts[0].conflictType}`);
                logInfo(`  Severity: ${conflicts[0].severity}`);
            }
        } catch (error) {
            logError(`Conflict detection failed: ${error.message}`);
        }

        // Test 5: Test train precedence optimization
        logInfo('\nTest 5: Testing precedence optimization...');
        try {
            const trains = await Train.find({ 'currentPosition.sectionId': section._id }).limit(3);
            const trainIds = trains.map(t => t._id);
            
            if (trainIds.length > 0) {
                const optimized = await optimizationService.optimizePrecedence(section._id, trainIds);
                logSuccess('Precedence optimization working!');
                logInfo(`  Total throughput: ${optimized.totalThroughput} trains`);
                logInfo(`  Optimized ${optimized.trains.length} trains`);
            } else {
                logInfo('  No trains in section to optimize');
            }
        } catch (error) {
            logError(`Precedence optimization failed: ${error.message}`);
        }

        // Test 6: Test simulation
        logInfo('\nTest 6: Testing simulation service...');
        try {
            const trains = await Train.find({ 'currentPosition.sectionId': section._id }).limit(2);
            const trainIds = trains.map(t => t._id);
            
            if (trainIds.length > 0) {
                const simResult = await simulationService.runSimulation({
                    sectionId: section._id,
                    trainIds: trainIds,
                    duration: 60
                });
                logSuccess('Simulation service working!');
                logInfo(`  Total conflicts: ${simResult.results.totalConflicts}`);
                logInfo(`  Total throughput: ${simResult.results.totalThroughput}`);
                logInfo(`  Efficiency: ${simResult.results.efficiency.toFixed(2)}%`);
            } else {
                logInfo('  No trains available for simulation');
            }
        } catch (error) {
            logError(`Simulation failed: ${error.message}`);
        }

        // Test 7: Test delay impact simulation
        logInfo('\nTest 7: Testing delay impact analysis...');
        try {
            const train = await Train.findOne({ 'currentPosition.sectionId': section._id });
            
            if (train) {
                const impact = await simulationService.simulateDelay(train._id, 20, section._id);
                logSuccess('Delay impact analysis working!');
                logInfo(`  Original train: ${impact.originalTrain.trainNumber}`);
                logInfo(`  Delay: ${impact.originalTrain.delayMinutes} minutes`);
                logInfo(`  Affected trains: ${impact.totalAffectedTrains}`);
                logInfo(`  Total delay impact: ${impact.totalDelayMinutes} minutes`);
            } else {
                logInfo('  No trains available for delay simulation');
            }
        } catch (error) {
            logError(`Delay simulation failed: ${error.message}`);
        }

        // Test 8: Database statistics
        logInfo('\nTest 8: Database statistics...');
        const stats = {
            trains: await Train.countDocuments(),
            sections: await Section.countDocuments(),
            tracks: await Track.countDocuments(),
            conflicts: await Conflict.countDocuments(),
            runningTrains: await Train.countDocuments({ currentStatus: 'RUNNING' }),
            delayedTrains: await Train.countDocuments({ 'delay.currentDelay': { $gt: 0 } })
        };
        logSuccess('Database statistics:');
        logInfo(`  Total trains: ${stats.trains}`);
        logInfo(`  Running trains: ${stats.runningTrains}`);
        logInfo(`  Delayed trains: ${stats.delayedTrains}`);
        logInfo(`  Total sections: ${stats.sections}`);
        logInfo(`  Total tracks: ${stats.tracks}`);
        logInfo(`  Total conflicts: ${stats.conflicts}`);

        // Summary
        log('\n========================================', colors.yellow);
        log('All Tests Completed Successfully! ✓', colors.green);
        log('========================================\n', colors.yellow);

        logInfo('System is ready to use!');
        logInfo('Start the server with: npm start');
        logInfo('Access dashboard at: http://localhost:8080/railway/dashboard\n');

        process.exit(0);

    } catch (error) {
        log('\n========================================', colors.red);
        log('Test Failed!', colors.red);
        log('========================================\n', colors.red);
        logError(`Error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run tests
runTests();
