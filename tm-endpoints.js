const https = require('https');

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};

async function refresh_auth_token() {
    return new Promise(async (resolve, reject) => {
        const options = {
            hostname: 'prod.trackmania.core.nadeo.online',
            path: '/v2/authentication/token/refresh',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `nadeo_v1 t=${refresh_token}`
            }
        };

        console.log('Refreshing token...');

        const req = https.request(options, res => {
            if (res.statusCode === 200) {
                let content = '';

                res.on('data', d => {
                    content += d;
                });

                res.on('end', () => {
                    jsonContent = JSON.parse(content);

                    access_token = jsonContent.accessToken;
                    refresh_token = jsonContent.refreshToken;

                    parsedToken = parseJwt(access_token);

                    exp_time = parsedToken.exp;

                    resolve();
                });
            }
            else {
                reject(`Could not refresh token. Status code ${res.statusCode}`);
            }
        });

        req.on('error', error => {
            reject(error);
        });

        req.end();
    });
};

async function check_expiration() {
    const now = new Date();
    const secondsSinceEpoch = Math.round(now.getTime() / 1000);

    if (exp_time <= secondsSinceEpoch) {
        try {
            await refresh_auth_token();
            return true;
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return false;
        }
    }

    return true;
}

let access_token = null;
let refresh_token = null;
let exp_time = -1;

module.exports = {
    async authenticate() {
        return new Promise(async (resolve, reject) => {
            const options = {
                hostname: 'prod.trackmania.core.nadeo.online',
                path: '/v2/authentication/token/basic',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                auth: `${process.env.TM_USERNAME}:${process.env.TM_PASSWORD}`
            };

            console.log('Authenticating...');

            const req = https.request(options, res => {
                if (res.statusCode === 200) {
                    let content = '';

                    res.on('data', d => {
                        content += d;
                    });

                    res.on('end', () => {
                        jsonContent = JSON.parse(content);

                        access_token = jsonContent.accessToken;
                        refresh_token = jsonContent.refreshToken;

                        parsedToken = parseJwt(access_token);

                        exp_time = parsedToken.exp;

                        resolve();
                    });
                }
                else {
                    reject(`Could not authenticate. Status code ${res.statusCode}`);
                }
            });

            req.on('error', error => {
                reject(error);
            });

            req.end();
        });
    },
    async get_times(season_id, account_ids) {
        return new Promise(async (resolve, reject) => {
            if (!await check_expiration()) {
                reject('Error refreshing auth token');
                return;
            }

            const options = {
                hostname: 'prod.trackmania.core.nadeo.online',
                path: `/mapRecords/?accountIdList=${account_ids.join()}&seasonId=${season_id}`,
                method: 'GET',
                headers: {
                    'Authorization': `nadeo_v1 t=${access_token}`
                }
            };

            console.log('Retrieving times...');

            const req = https.request(options, res => {
                if (res.statusCode === 200) {
                    let content = '';

                    res.on('data', d => {
                        content += d;
                    });

                    res.on('end', () => {
                        jsonContent = JSON.parse(content);

                        resolve(jsonContent);
                    });
                }
                else {
                    reject(`Could not retrieve times. Status code ${res.statusCode}`);
                }
            });

            req.on('error', error => {
                reject(error);
            });

            req.end();
        });
    },
    async get_maps_info(mapIds) {
        return new Promise(async (resolve, reject) => {
            if (!await check_expiration()) {
                reject('Error refreshing auth token');
                return;
            }

            const options = {
                hostname: 'prod.trackmania.core.nadeo.online',
                path: `/maps/?mapIdList=${mapIds.join()}`,
                method: 'GET',
                headers: {
                    'Authorization': `nadeo_v1 t=${access_token}`
                }
            };

            console.log('Retrieving maps info...');

            const req = https.request(options, res => {
                if (res.statusCode === 200) {
                    let content = '';

                    res.on('data', d => {
                        content += d;
                    });

                    res.on('end', () => {
                        jsonContent = JSON.parse(content);

                        resolve(jsonContent);
                    });
                }
                else {
                    reject(`Could not retrieve map info. Status code ${res.statusCode}`);
                }
            });

            req.on('error', error => {
                reject(error);
            });

            req.end();
        });
    },
    async get_season_info(season_id) {
        return new Promise(async (resolve, reject) => {
            if (!await check_expiration()) {
                reject('Error refreshing auth token');
                return;
            }

            const options = {
                hostname: 'prod.trackmania.core.nadeo.online',
                path: `/seasons/${season_id}`,
                method: 'GET',
                headers: {
                    'Authorization': `nadeo_v1 t=${access_token}`
                }
            };

            console.log('Retrieving season info...');

            const req = https.request(options, res => {
                if (res.statusCode === 200) {
                    let content = '';

                    res.on('data', d => {
                        content += d;
                    });

                    res.on('end', () => {
                        jsonContent = JSON.parse(content);

                        resolve(jsonContent);
                    });
                }
                else {
                    reject(`Could not retrieve season info. Status code ${res.statusCode}`);
                }
            });

            req.on('error', error => {
                reject(error);
            });

            req.end();
        });
    }
};