export { auth, db, storage, firebaseConfig, getMessagingInstance } from './config';
export { default as app } from './config';

// Multi-tenant collection helpers
export {
  getCollectionPath,
  getCollection,
  getDocRef,
  getAcademyRef,
  getUserAcademyMappingRef,
  collections,
  rootCollections,
} from './collections';
