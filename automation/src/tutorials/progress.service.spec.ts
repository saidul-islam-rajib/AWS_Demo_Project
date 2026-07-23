import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let dir: string;
  let service: ProgressService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'progress-test-'));
    process.env.DATA_DIR = dir;
    service = new ProgressService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts with nothing completed', () => {
    expect(service.completed('user-1')).toEqual([]);
    expect(service.isComplete('user-1', 'lesson-1')).toBe(false);
  });

  it('records a completed lesson', () => {
    service.mark('user-1', 'lesson-1');

    expect(service.isComplete('user-1', 'lesson-1')).toBe(true);
    expect(service.completed('user-1')).toEqual(['lesson-1']);
  });

  it('does not record the same lesson twice', () => {
    service.mark('user-1', 'lesson-1');
    service.mark('user-1', 'lesson-1');

    expect(service.completed('user-1')).toEqual(['lesson-1']);
  });

  it('keeps the first completion time when marked again', () => {
    service.mark('user-1', 'lesson-1');
    const first = service.completed('user-1');

    service.mark('user-1', 'lesson-1');

    expect(service.completed('user-1')).toEqual(first);
  });

  it('takes a completion back', () => {
    service.mark('user-1', 'lesson-1');
    service.unmark('user-1', 'lesson-1');

    expect(service.isComplete('user-1', 'lesson-1')).toBe(false);
  });

  it('ignores unmarking something never completed', () => {
    service.mark('user-1', 'lesson-1');
    service.unmark('user-1', 'lesson-2');

    expect(service.completed('user-1')).toEqual(['lesson-1']);
  });

  it('sets either way from one call', () => {
    service.set('user-1', 'lesson-1', true);
    expect(service.isComplete('user-1', 'lesson-1')).toBe(true);

    service.set('user-1', 'lesson-1', false);
    expect(service.isComplete('user-1', 'lesson-1')).toBe(false);
  });

  it('keeps one account out of another', () => {
    service.mark('user-1', 'lesson-1');

    expect(service.isComplete('user-2', 'lesson-1')).toBe(false);
    expect(service.completed('user-2')).toEqual([]);
  });

  it('does not let one account unmark another', () => {
    service.mark('user-1', 'lesson-1');
    service.unmark('user-2', 'lesson-1');

    expect(service.isComplete('user-1', 'lesson-1')).toBe(true);
  });

  it('counts only the lessons asked about', () => {
    service.mark('user-1', 'lesson-1');
    service.mark('user-1', 'lesson-9');

    expect(service.countOf('user-1', ['lesson-1', 'lesson-2'])).toBe(1);
  });

  it('reports a course finished only when every lesson is done', () => {
    const course = ['lesson-1', 'lesson-2'];

    service.mark('user-1', 'lesson-1');
    expect(service.hasFinished('user-1', course)).toBe(false);

    service.mark('user-1', 'lesson-2');
    expect(service.hasFinished('user-1', course)).toBe(true);
  });

  it('does not call an empty course finished', () => {
    expect(service.hasFinished('user-1', [])).toBe(false);
  });

  it('stops being finished when a lesson is added to the course', () => {
    service.mark('user-1', 'lesson-1');

    expect(service.hasFinished('user-1', ['lesson-1'])).toBe(true);
    expect(service.hasFinished('user-1', ['lesson-1', 'lesson-2'])).toBe(false);
  });

  it('survives a restart', () => {
    service.mark('user-1', 'lesson-1');

    expect(new ProgressService().isComplete('user-1', 'lesson-1')).toBe(true);
  });

  it('survives a restart after a completion is taken back', () => {
    service.mark('user-1', 'lesson-1');
    service.mark('user-1', 'lesson-2');
    service.unmark('user-1', 'lesson-1');

    expect(new ProgressService().completed('user-1')).toEqual(['lesson-2']);
  });
});
