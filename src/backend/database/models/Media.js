// media model

import moment from 'moment';
import Images from './Images';
import IgUsers from './IgUsers';
import { MediaTags, QueriesMedia } from './Intermediates';

export default (knex) => {

  const images = Images(knex);
  const igUsers = IgUsers(knex);
  const mediaTags = MediaTags(knex);
  const queriesMedia = QueriesMedia(knex);

  const create = (media) => {

    if(media.type === "video"){
      console.log("video type");
      console.log(JSON.stringify(media)); 
    }
    const addImage = () => new Promise(function(resolve, reject) {
      resolve(images.create(media.images));
    });
    const addUser = () => new Promise(function(resolve, reject) {
      resolve(igUsers.create(media.user));
    });


    return Promise.all([addImage(), addUser()])
      .then((ids) => knex('media').insert({
          number_likes: media.likes.count,
          number_comments: media.comments.count,
          type: media.type,
          attribution: media.attribution,
          location: JSON.stringify(media.location),
          filter: media.filter,
          created_time: moment.unix(parseInt(media.created_time)).toISOString(),
          link_url: media.link,
          image_id: ids[0][0],
          ig_users_id: ids[1][0],
          caption_text: media.caption ? media.caption.text : null,
          caption_created_time: media.caption ? moment.unix(parseInt(media.caption.created_time)).toISOString() : null,
        })
      .returning('id'));

  };

  const read = {
    byId: (id) => knex('media').where({ id }).select(),
    byCreatedTime: (range) => knex('media').whereBetween('creted_time', [range.startDate, range.endDate]),
  };

  // 'delete' is a reserved keyword.
  const del = {
    byId: (id) => knex('media').where({ id }).del(),
  };

  return {
    create,
    read,
    del,
  };
};
