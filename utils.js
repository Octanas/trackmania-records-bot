module.exports = {
    get_medal(place) {
        if (place == 0)
            return ':x:';
        else if (place == 1)
            return ':first_place:';
        else if (place == 2)
            return ':second_place:';
        else if (place == 3)
            return ':third_place:';
        else
            return ':medal:';
    },
    millisecondsToTime(milli) {
        var milliseconds = milli % 1000;
        var seconds = Math.floor((milli / 1000) % 60);
        var minutes = Math.floor((milli / (60 * 1000)) % 60);

        return minutes.toString().padStart(2, '0') + ":" + seconds.toString().padStart(2, '0') + "." + milliseconds.toString().padStart(3, '0');
    }
}