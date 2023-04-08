const { ethers } = require("ethers")

exports.fromEther = (value) => {
    return ethers.utils.formatEther(value)
}

exports.fromUsdc = (value) => {
    return ethers.utils.formatUnits(value, 6)
}

exports.toEther = (value) => {
    return ethers.utils.parseEther(`${value}`)
}

exports.toUsdc = (value) => {
    return ethers.utils.parseUnits(`${value}`, 6)
}

exports.shuffle = (array) => {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return [...new Set(array)];
}

exports.randomWords = [
    "suntan",
    "follow",
    "guitar",
    "forecast",
    "Bible",
    "exposure",
    "regular",
    "species",
    "sample",
    "dismissal",
    "Session",
    "career",
    "criminal",
    "soft",
    "seem",
    "preparation",
    "struggle",
    "squeeze",
    "foot",
    "rush",
    "Freight",
    "power",
    "resignation",
    "liver",
    "unanimous",
    "custody",
    "respectable",
    "regulation",
    "reign",
    "Survivor",
    "fit",
    "switch",
    "mouse",
    "solo",
    "Presidential",
    "carriage",
    "bubble",
    "dividend",
    "Willpower",
    "surround",
    "title",
    "Boy",
    "beard",
    "despair",
    "Dealer",
    "occupy",
    "coerce",
    "approach",
    "Registration",
    "dilemma"
]