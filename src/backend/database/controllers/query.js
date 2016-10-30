import moment from 'moment';
import Tags from '../models/Tags';
import Queries from '../models/Queries';
import Media from '../models/Media';
import Images from '../models/Images';
import IgUsers from '../models/IgUsers';
import { QueriesMedia } from '../models/Intermediates';
import Interface from '../../instagram/Interface';
import Mailer from '../../mailer/mailer';
const { sendConfirmationEmail, sendResultsEmail } = Mailer;

const { getPhotosInDateRange } = Interface;

export default (knex) => {
  const tags = Tags(knex);
  const queries = Queries(knex);
  const queriesMedia = QueriesMedia(knex);
  const media = Media(knex);
  const images = Images(knex);
  const igUsers = IgUsers(knex);
  const LOAD = Infinity;

  const startQuery = (tagName, { startDate, endDate }, userEmail, res) => new Promise(function(resolve, reject) {
    console.log("startQuery", tagName, { startDate, endDate }, userEmail)
    let queryId; // closure ensures we have access to this throughout the "then" chain.
    let confirmationEmailInfo;
    let resultsEmailInfo;
    let mediaIds;
    let inProg;

    queries.create(tagName, { startDate, endDate }, userEmail)
      .then((ids) => {
        console.log("inside queries.create then")
        queryId = ids[0];
        return queries.countInProgress();
      })
      .then((count) => {
        inProg = count;
        let placement = parseInt(inProg[0].count) + 1;
        console.log("should send back:", {
          placement: placement,
          email: userEmail,
          id: queryId,
        })
        res.send({
          placement: placement,
          email: userEmail,
          id: queryId,
        });
        return sendConfirmationEmail(tagName, { startDate, endDate }, userEmail);
      })
      .then((info) => {
        confirmationEmailInfo = info;
        return getPhotosInDateRange(tagName, { startDate: moment(startDate).unix(), endDate: moment(endDate).unix() }, (inProg[0].count > LOAD));
      })
      .then((photos) =>Promise.all(photos.data.map((photo) => media.create(photo))))
      .then((ids) => {
        mediaIds = ids.map((id) => id[0]);
        return Promise.all(mediaIds.map(
          (mediaId) => queriesMedia.create({
            query_id: queryId,
            media_id: mediaId
          })));
      })
      .then(() => queries.complete(queryId))
      .then(() => sendResultsEmail(tagName, { startDate, endDate }, userEmail, queryId))
      .then((info) => {
        resultsEmailInfo = info;
        resolve({
          resultsEmailInfo,
          confirmationEmailInfo,
          queryId,
          mediaIds,
        });
      })
      .catch((err) => reject(err));
});

  const retrieveQuery = (id, res) => new Promise(function(resolve, reject) {
    let queryId;
    let startDate;
    let endDate;
    queries.read.byId(id)
      .then((records) => {
        queryId = records[0].id;
        startDate = records[0].earliest_date;
        endDate = records[0].latest_date;
        return records[0];
      })
      .then((record) => queriesMedia.read.by({ query_id: queryId }))
      .then((qmfRecords) => Promise.all(qmfRecords.map((record) => media.read.byId(record.media_id))))
      .then((rawRecords) => rawRecords.map((r) => r[0]))
      .then((qmRecords) => qmRecords.filter((record) => ((
          moment(record.created_time).isSameOrBefore(endDate) &&
          moment(record.created_time).isSameOrAfter(startDate)
        ) || (
          moment(record.caption_created_time).isSameOrBefore(endDate) &&
          moment(record.caption_created_time).isSameOrAfter(startDate)
      ))))
      .then((mRecords) => {
        return Promise.all(mRecords.map((mRecord) => Promise.all([
          mRecord,
          images.read.byId(mRecord.image_id),
          igUsers.read.byId(mRecord.ig_users_id),
        ])));
      })
      .then((results) => results.map((result) => ({
        media: result[0],
        images: result[1],
        user: result[2]
      })))
      .then((data) => {
        res.send(data);
        resolve(data);
      })
      .catch((e) => reject(e));
  });

  return {
    startQuery,
    retrieveQuery,
  };
};
