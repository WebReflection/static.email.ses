import AWS from 'aws-sdk';
import {post} from 'faroff';
import marked from 'marked';
import safe from 'escape-string-regexp';

const {isArray} = Array;
const {keys} = Object;

const statuses = {
  200: 'OK',
  400: 'Bad Request',
  403: 'Forbidden',
  500: 'Internal Server Error'
};

const end = (response, code) => {
  response.status(code).send(statuses[code]);
};

export const create = ({
  // email details
  to,               // the validated email address target
  site,             // the domain sending emails
  sender,           // the name used for the "from" email address

  // AWS SES details
  region,           // the AWS SES region
  accessKeyId,      // the AWS IAM access key id
  secretAccessKey,  // the AWS IAM secret access key

  // optional details
  anySite,          // accept post requests from any domain, default false
  apiVersion,       // the SES API version, default "2010-12-01"
  charset,          // the optional charset to use, default "UTF-8"
  log,              // logs success/error operations, default false
  recaptcha,        // secret key for communication between your site and reCAPTCHA
  senderReply       // the "from" email address, default no-reply
}) => {
  const RECAPTCHA = !!recaptcha;
  const LOG = !!log;
  const Charset = charset || 'UTF-8';
  const Destination = {ToAddresses: isArray(to) ? to : to.split(/\s*,\s*/)};
  const Source = `"${sender}" <${senderReply || 'no-reply'}@${site}>`;
  const referer = anySite ? /./ : new RegExp('^' + safe(`https://${site}/`));
  const SESConfig = {
    apiVersion: apiVersion || '2010-12-01',
    region,
    accessKeyId,
    secretAccessKey
  };
  return (request, response) => {
    try {
      if (request.method !== 'POST' || !referer.test(request.headers.referer))
        throw 400;

      const {body} = request;
      if (typeof body !== 'object')
        throw 400;

      const details = keys(body);
      if (RECAPTCHA && !details.includes('recaptcha') || !body.recaptcha)
        throw 403;

      const send = () => {
        const withText = details.includes('text');
        const withHTML = details.includes('html');
        const withMD = details.includes('md');
  
        if (!(withText || withHTML || withMD))
          throw 400;
  
        const Body = {};
        const params = {
          Source, Destination,
          Message: {
            Body, Subject: {
              Charset,
              Data: (body.subject || '').trim() || 'No Subject'
            }
          }
        };
  
        if (withText)
          Body.Text = {Charset, Data: body.text};
  
        if (withMD) {
          const {md} = body;
          Body.Html = {Charset, Data: marked(md)};
          if (!withText)
            Body.Text = {Charset, Data: md};
        }
        else if (withHTML)
          Body.Html = {Charset, Data: body.html};
  
        if (details.includes('from'))
          params.ReplyToAddresses = [body.from];
  
        new AWS.SES(SESConfig).sendEmail(params).promise().then(
          data => { if (LOG) console.log(data); end(response, 200); },
          err => { if (LOG) console.error(err, err.stack); end(response, 500); }
        );
      };

      if (RECAPTCHA) {
        const query = {
          secret: recaptcha,
          response: body.recaptcha,
          remoteip: request.headers['x-forwarded-for'] ||
                    request.connection.remoteAddress
        };
        post('https://www.google.com/recaptcha/api/siteverify', {query}).then(
          result => {
            if (result.json && result.json.success)
              send();
            else {
              if (LOG) console.error(query, result);
              end(response, 403);
            }
          },
          error => {
            if (LOG) console.error(query, error);
            end(response, 500);
          }
        );
      }
      else
        send();
    }
    catch (o_O) {
      end(response, o_O);
    }
  };
};
