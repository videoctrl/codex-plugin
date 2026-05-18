export function pullLibraryTemplate(libraryId: string) {
  return {
    libraryId,
    message: "Library template pull is ready for a connected library source."
  };
}

export function remixLibraryVideo(libraryId: string) {
  return {
    libraryId,
    message: "Created remix instructions. Import source assets before rendering."
  };
}
