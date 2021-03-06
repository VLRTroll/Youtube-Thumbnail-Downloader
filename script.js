/* DOM Elements Capturing */
const form = document.querySelector('form');
const formInput = document.querySelector('form input');

const image = document.getElementById('thumbnail');
const downloadButton = document.getElementById('download-button');

const resolutionOptions = Array.from(document.querySelector('ol').children);
const zipOption = document.getElementById('zip-option');
const allOptions = resolutionOptions.concat(zipOption);

/* Setting Constants */
const defaultImageSize = { width: image.width, heigth: image.height };
let videoId = null;
let imageBlobs = [];

const urlRegexValidator = /(youtu\.be\/|youtube\.com\/watch\?v=)([^&\?]{11})/;

const thumbnailLinks = [
	(id) => `https://img.youtube.com/vi/${id}/default.jpg`,
	(id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
	(id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
	(id) => `https://img.youtube.com/vi/${id}/sddefault.jpg`,
	(id) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
	(id) => `https://img.youtube.com/vi/${id}/1.jpg`,
	(id) => `https://img.youtube.com/vi/${id}/2.jpg`,
	(id) => `https://img.youtube.com/vi/${id}/3.jpg`,
];

/* Preview Section */
const putLoadingBackground = () => {
	image.style.width = `${defaultImageSize.width}px`;
	image.style.height = `${defaultImageSize.heigth}px`;

	const loadingGifURL =
		'https://github.com/VLRTroll/Youtube-Thumbnail-Downloader/blob/master/assets/loading.gif';
	image.style.setProperty('background', `url(${loadingGifURL}) center`);
	image.style.setProperty('background-color', 'white');
	image.style.setProperty('background-size', '300px');
	image.style.setProperty('background-repeat', 'no-repeat');
};

const downloadThumbnails = async () => {
	const CORS_BASE_URL = 'https://cors-anywhere.herokuapp.com';

	const headers = new Headers();
	headers.append('Access-Control-Allow-Origin', '*');
	headers.append('Content-Type', 'image/jpeg');

	const getThumbnail = (url) => fetch(CORS_BASE_URL + '/' + url, headers);

	const responses = await Promise.allSettled(
		thumbnailLinks.map((link) => getThumbnail(link(videoId)))
	);

	imageBlobs = (
		await Promise.allSettled(
			responses.map((response) => response.value?.blob())
		)
	).map(({ value }) => value);
};

const resetOptionStatus = () => {
	imageBlobs.slice(0, 5).forEach((blob, index) => {
		resolutionOptions[index].classList.remove('active');
		resolutionOptions[index].classList.remove('disable');

		if (!blob) {
			resolutionOptions[index].classList.add('disable');
		}
	});
};

const putThumbnailImage = (imageSize) => {
	const thumbnailsWidthEnum = [120, 320, 480, 640, 1280];
	const index = thumbnailsWidthEnum.indexOf(imageSize);

	image.src = thumbnailLinks[index](videoId);
	image.alt = 'Thumbnail Preview';
};

form.addEventListener('submit', (event) => {
	event.preventDefault();

	const url = formInput.value;
	if (url.length === 0) return;

	if (urlRegexValidator.test(url)) {
		const newVideoId = url.match(urlRegexValidator).pop();

		if (newVideoId !== videoId) {
			putLoadingBackground();

			videoId = newVideoId;
			downloadThumbnails();
			resetOptionStatus();

			putThumbnailImage(image.width);
		}
	} else {
		alert(
			`Unsupported Youtube URL format. Try something like this:\nhttps://www.youtube.com/watch?v=jh4lAnX4K0c\nhttps://youtu.be/jh4lAnX4K0c`
		);
	}
});

/* Option Section */
const updateThumbnailImage = (imageIndex) => {
	const thumbnailsWidthEnum = [120, 320, 480, 640, 1280];
	const thumbnailsHeightEnum = [90, 180, 360, 480, 720];

	if (thumbnailsWidthEnum[imageIndex] > defaultImageSize.width) {
		const scale = defaultImageSize.width / thumbnailsWidthEnum[imageIndex];

		image.style.height = `${thumbnailsHeightEnum[imageIndex] * scale}px`;
		image.style.width = `${defaultImageSize.width}px`;
	} else {
		image.style.height = `${thumbnailsHeightEnum[imageIndex]}px`;
		image.style.width = `${thumbnailsWidthEnum[imageIndex]}px`;
	}

	image.src = thumbnailLinks[imageIndex](videoId);
	image.alt = 'Thumbnail Preview';
};

const selectOption = (option, index) => {
	allOptions.forEach((element) => element.classList.remove('active'));

	if (videoId) {
		option.classList.add('active');
		if (option !== zipOption) updateThumbnailImage(index);
	}
};

allOptions.forEach((option, index) =>
	option.addEventListener('click', () => selectOption(option, index))
);

/* Download Section */
const getFilename = (index) => {
	const resolution = resolutionOptions[index].lastElementChild.textContent;
	const filename = `thumbnail_${resolution.replace(/\s/g, '')}.jpg`;
	return filename;
};

const downloadThumbnail = async (index) => {
	try {
		const blob = imageBlobs[index];
		saveAs(blob, getFilename(index));
	} catch (error) {
		alert('Fail during download thumbnail process.');
	}
};

const downloadThumbnailZip = async () => {
	/* Criação do arquivo ZIP */
	const Zip = new JSZip();
	const folder = Zip.folder(`Thumbnails_${videoId}`);
	const previewFolder = folder.folder('PreviewThumbnails');

	/* Thumbnail grouping */
	const previewThumbnails = Array.from(imageBlobs);
	const thumbnails = previewThumbnails.splice(1, 4);

	/* Inserção das imagens no ZIP */
	thumbnails.forEach((thumbnail, index) => {
		if (thumbnail) {
			folder.file(getFilename(index + 1), thumbnail);
		}
	});

	previewThumbnails.forEach((thumbnail, index) => {
		if (thumbnail) {
			previewFolder.file(`${index}.jpg`, thumbnail);
		}
	});

	/* Download do ZIP */
	Zip.generateAsync({ type: 'blob' }).then((content) =>
		saveAs(content, 'Thumbnails.zip')
	);
};

downloadButton.addEventListener('click', () => {
	const activeOptionIndex = allOptions.findIndex((option) =>
		option.classList.contains('active')
	);

	if (videoId && activeOptionIndex) {
		if (activeOptionIndex === allOptions.length - 1) {
			downloadThumbnailZip();
		} else {
			downloadThumbnail(activeOptionIndex);
		}
	}
});
