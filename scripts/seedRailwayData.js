/**
 * Seed Railway Data
 * This script populates the database with sample railway data for testing
 */

if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const Train = require('../models/train');
const Section = require('../models/section');
const Track = require('../models/track');

async function seedData() {
    try {
        // Connect to database
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log('Connected to database');

        // Clear existing railway data
        await Train.deleteMany({});
        await Section.deleteMany({});
        await Track.deleteMany({});
        console.log('Cleared existing railway data');

        // Create Section 1
        const section1 = await Section.create({
            sectionCode: 'SEC001',
            sectionName: 'Mumbai-Pune Section',
            description: 'Main section connecting Mumbai and Pune',
            characteristics: {
                totalLength: 192,
                numberOfTracks: 2,
                trackType: 'DOUBLE',
                electrification: 'AC',
                maxSpeed: 130,
                gradient: '1:150',
                signallingSystem: 'AUTOMATIC_BLOCK'
            },
            stations: [
                {
                    stationCode: 'CSMT',
                    stationName: 'Mumbai CSMT',
                    kilometer: 0,
                    platforms: 18,
                    isJunction: true,
                    crossingPoint: false
                },
                {
                    stationCode: 'KYN',
                    stationName: 'Kalyan Junction',
                    kilometer: 54,
                    platforms: 8,
                    isJunction: true,
                    crossingPoint: true
                },
                {
                    stationCode: 'LNL',
                    stationName: 'Lonavala',
                    kilometer: 106,
                    platforms: 4,
                    isJunction: false,
                    crossingPoint: true
                },
                {
                    stationCode: 'PUNE',
                    stationName: 'Pune Junction',
                    kilometer: 192,
                    platforms: 6,
                    isJunction: true,
                    crossingPoint: false
                }
            ],
            capacity: {
                maxTrainsPerHour: 12,
                currentUtilization: 60,
                averageDwellTime: 5
            },
            operationalStatus: 'OPERATIONAL'
        });

        // Create tracks
        const track1Up = await Track.create({
            trackNumber: 'UP1',
            sectionId: section1._id,
            trackType: 'UP',
            startPoint: { stationCode: 'CSMT', stationName: 'Mumbai CSMT', kilometer: 0 },
            endPoint: { stationCode: 'PUNE', stationName: 'Pune Junction', kilometer: 192 },
            length: 192,
            status: 'AVAILABLE'
        });

        const track1Down = await Track.create({
            trackNumber: 'DOWN1',
            sectionId: section1._id,
            trackType: 'DOWN',
            startPoint: { stationCode: 'PUNE', stationName: 'Pune Junction', kilometer: 192 },
            endPoint: { stationCode: 'CSMT', stationName: 'Mumbai CSMT', kilometer: 0 },
            length: 192,
            status: 'AVAILABLE'
        });

        section1.tracks = [track1Up._id, track1Down._id];
        await section1.save();

        // Create trains
        const now = Date.now();
        await Train.create([
            {
                trainNumber: '12027',
                trainName: 'Shatabdi Express',
                trainType: 'EXPRESS',
                priority: 9,
                currentStatus: 'RUNNING',
                currentPosition: {
                    sectionId: section1._id,
                    trackId: track1Up._id,
                    kilometer: 80
                },
                schedule: {
                    origin: 'Mumbai CSMT',
                    destination: 'Pune',
                    scheduledDeparture: new Date(now - 60 * 60000),
                    scheduledArrival: new Date(now + 60 * 60000)
                },
                characteristics: {
                    length: 200,
                    maxSpeed: 130,
                    weight: 500
                },
                delay: { currentDelay: 0, reasons: [] }
            },
            {
                trainNumber: '11010',
                trainName: 'Deccan Express',
                trainType: 'EXPRESS',
                priority: 7,
                currentStatus: 'RUNNING',
                currentPosition: {
                    sectionId: section1._id,
                    trackId: track1Down._id,
                    kilometer: 150
                },
                schedule: {
                    origin: 'Pune',
                    destination: 'Mumbai CSMT',
                    scheduledDeparture: new Date(now - 90 * 60000),
                    scheduledArrival: new Date(now + 30 * 60000)
                },
                characteristics: {
                    length: 250,
                    maxSpeed: 110,
                    weight: 600
                },
                delay: {
                    currentDelay: 15,
                    reasons: [{ reason: 'Signal delay', delayMinutes: 15, timestamp: new Date() }]
                }
            }
        ]);

        console.log('✓ Railway data seeded successfully!');
        console.log(`  - Sections: ${await Section.countDocuments()}`);
        console.log(`  - Tracks: ${await Track.countDocuments()}`);
        console.log(`  - Trains: ${await Train.countDocuments()}`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
