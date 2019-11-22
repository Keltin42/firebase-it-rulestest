const firebase = require('@firebase/testing');
const fs = require('fs');

/*
 * ============
 *    Setup
 * ============
 */
const projectId = 'firestore-emulator-example';
const firebasePort = require('../firebase.json').emulators.firestore.port;
const port = firebasePort /** Exists? */ ? firebasePort : 8080;
const coverageUrl = `http://localhost:${port}/emulator/v1/projects/${projectId}:ruleCoverage.html`;

const rules = fs.readFileSync('firestore.rules', 'utf8');

/**
 * Creates a new app with authentication data matching the input.
 *
 * @param {object} auth the object to use for authentication (typically {uid: some-uid})
 * @return {object} the app.
 */
function authedApp(auth) {
    return firebase.initializeTestApp({ projectId, auth }).firestore();
}

async function createTestData(db) {
    // Initialize some data
    const playersCollection = db.collection('players');
    await firebase.assertSucceeds(playersCollection.add({
      name: 'Sue'
    }));
    await firebase.assertSucceeds(playersCollection.add({
      name: 'Bob'
    }));
    await firebase.assertSucceeds(playersCollection.doc('good').set({
      name: 'Fred'
    }));
    await firebase.assertSucceeds(playersCollection.doc('query-blocker').set({
      name: 'Tim', private: true
    }));

    console.log('Initialized test data.');
}

/*
 * ============
 *  Test Cases
 * ============
 */
beforeEach(async () => {
    // Clear the database between tests
    await firebase.clearFirestoreData({ projectId });
  });

before(async () => {
    await firebase.loadFirestoreRules({ projectId, rules });
});

after(async () => {
    await Promise.all(firebase.apps().map(app => app.delete()));
    console.log(`View rule coverage information at ${coverageUrl}\n`);
});

describe('My app', () => {

    it('should let me read just the good document', async () => {
      // Read just the query-blocker record
      const db = authedApp({ uid: 'tim' });
      await createTestData(db);

      const playersCollection = db.collection('players');
      await firebase.assertSucceeds(
        playersCollection.doc('good').get().then(doc => {
          console.log('The good document: ', JSON.stringify(doc.data()));
        })
      );
    });


    it('should let me read all the records', async () => {
        // Read all the records
        const db = authedApp({ uid: 'tim' });
        await createTestData(db);

        const playersCollection = db.collection('players');
        await firebase.assertSucceeds(
          playersCollection.get().then(querySnapshot => {
            console.log('All documents: ');
            querySnapshot.forEach(doc => {
              console.log('\t', doc.id, ' => ', doc.data());
            })
          })
        );
    });

    it('should let me read just the query-blocker record', async () => {
        // Read just the query-blocker record
        const db = authedApp({ uid: 'tim' });
        await createTestData(db);

        const playersCollection = db.collection('players');

        await firebase.assertSucceeds(
          playersCollection.doc('query-blocker').get().then(doc => {
            console.log('The query-blocker document: ', JSON.stringify(doc.data()));
          })
        );
    });
});
